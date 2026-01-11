#!/usr/bin/env python3
"""
User Migration Service
Migrates users from legacy MySQL to Keycloak using admin credentials
"""

import os
import sys
import MySQLdb as mysql
import requests
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

from auth_manager import KeycloakAuthManager

@dataclass
class Config:
    """Configuration from environment variables"""
    # MySQL
    mysql_host: str = os.getenv('MYSQL_HOST', '')
    mysql_user: str = os.getenv('MYSQL_USER', 'xerafin')
    mysql_db: str = os.getenv('MYSQL_DB', 'migration')
    mysql_pwd: str = os.getenv('MYSQL_PWD', '')

    # Keycloak
    keycloak_url: str = os.getenv('KEYCLOAK_URL', 'http://localhost:8080')
    keycloak_realm: str = os.getenv('KEYCLOAK_REALM', 'Xerafin')
    keycloak_admin_user: str = os.getenv('KEYCLOAK_USER', 'admin')
    keycloak_admin_password: str = os.getenv('KEYCLOAK_PASSWORD', '')

    # Migration settings
    batch_size: int = int(os.getenv('BATCH_SIZE', '50'))
    test_mode: bool = os.getenv('TEST_MODE', 'true').lower() == 'true'
    dry_run: bool = os.getenv('DRY_RUN', 'false').lower() == 'true'
    log_level: str = os.getenv('LOG_LEVEL', 'INFO').upper()

    def validate(self):
        """Validate required environment variables"""
        errors = []

        if not self.mysql_pwd:
            errors.append("MYSQL_PWD is required")
        if not self.keycloak_admin_password:
            errors.append("KEYCLOAK_ADMIN_PASSWORD is required")

        if errors:
            raise ValueError("Configuration errors: " + ", ".join(errors))

        return self

class MigrationService:
    def __init__(self, config: Config):
        self.config = config
        self.setup_logging()

        # Initialize components
        self.init_mysql()
        self.init_keycloak()

        # Create tracking table
        self.create_tracking_table()

        self.logger.info("Migration service initialized")
        if config.dry_run:
            self.logger.warning("🚧 DRY RUN MODE - No changes will be made to Keycloak")

    def setup_logging(self):
      """Configure logging to stdout only"""
      log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

      logging.basicConfig(
        level=getattr(logging, self.config.log_level),
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)]  # Only stdout, no file
      )
      self.logger = logging.getLogger(__name__)

    def init_mysql(self):
        """Initialize MySQL connection"""
        try:
            self.mysql_conn = mysql.connect(
                host=self.config.mysql_host,
                user=self.config.mysql_user,
                password=self.config.mysql_pwd,
                database=self.config.mysql_db,
                autocommit=False
            )
            self.logger.info(f"Connected to MySQL database: {self.config.mysql_db}")
        except mysql.Error as err:
            self.logger.error(f"MySQL connection error: {err}")
            raise

    def init_keycloak(self):
        """Initialize Keycloak connection and store the admin client"""
        try:
            self.auth_manager = KeycloakAuthManager()
            self.keycloak_admin = self.auth_manager.admin_client

            if self.auth_manager.test_connection():
                self.logger.info(f"Connected to Keycloak realm: {self.config.keycloak_realm}")
            else:
                raise Exception("Failed to connect to Keycloak")

        except Exception as e:
            self.logger.error(f"Keycloak initialization error: {e}")
            raise

    def create_tracking_table(self):
        """Create table to track migration progress"""
        cursor = self.mysql_conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS migration_progress (
            userid INT PRIMARY KEY,
            keycloak_uuid VARCHAR(36),
            username VARCHAR(255),
            email VARCHAR(255),
            status ENUM('pending', 'success', 'failed', 'skipped') DEFAULT 'pending',
            error_message TEXT,
            migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            retry_count INT DEFAULT 0,
            details JSON,
            INDEX idx_status (status),
            INDEX idx_uuid (keycloak_uuid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)

        self.mysql_conn.commit()
        cursor.close()
        self.logger.info("Migration tracking table ready")

    def get_users_to_migrate(self) -> List[Dict]:
        """Get users that need migration"""
        cursor = self.mysql_conn.cursor(mysql.cursors.DictCursor)

        limit_clause = "LIMIT 5" if self.config.test_mode else ""

        query = f"""
        SELECT
            ua.userid, ua.email,
            ua.firstname, ua.lastname,
            ua.firstname || ' ' || ua.lastname as username,
            up.closet, up.newWordsAtOnce, up.reschedHrs,
            up.showNumSolutions, up.cb0max, up.showHints,
            up.schedVersion, up.countryId
        FROM user_auth ua
        LEFT JOIN user_prefs up ON ua.userid = up.userid
        WHERE NOT EXISTS (
            SELECT 1 FROM migration_progress mp
            WHERE mp.userid = ua.userid
            AND mp.status IN ('success', 'skipped')
        )
        ORDER BY ua.userid DESC
        {limit_clause}
        """

        cursor.execute(query)
        users = cursor.fetchall()
        cursor.close()

        self.logger.info(f"Found {len(users)} users to migrate")
        return users

    def extract_preferences(self, user_data: Dict) -> Dict:
        """Extract user preferences from legacy data"""
        preferences = {}

        # Map legacy columns to attribute names
        preference_map = {
            'closet': 'closet',
            'newWordsAtOnce': 'newWordsAtOnce',
            'reschedHrs': 'reschedHrs',
            'showNumSolutions': 'showNumSolutions',
            'cb0max': 'cb0max',
            'showHints': 'showHints',
            'schedVersion': 'schedVersion',
            'countryId': 'countryId'
        }

        for legacy_key, attr_name in preference_map.items():
            if legacy_key in user_data and user_data[legacy_key] is not None:
                preferences[attr_name] = str(user_data[legacy_key])

        preferences['lexicon'] = 'csw'
        preferences['lexiconVersion'] = '24'
        return preferences

    def user_exists_in_keycloak(self, username: str, email: str) -> Optional[str]:
        """Check if user already exists in Keycloak"""
        try:
          users = self.keycloak_admin.get_users({"username": username, "exact": True})
          if users:
            return users[0]['id']

          users = self.keycloak_admin.get_users({"email": email, "exact": True})
          if users:
            return users[0]['id']
        except Exception as e:
          self.logger.error(f"Error checking user: {e}")

        return None

    def create_keycloak_user(self, user_data: Dict) -> Optional[str]:
        """Create user directly in Keycloak"""
        if self.config.dry_run:
            self.logger.info(f"[DRY RUN] Would create user: {user_data['username']}")
            return "dry-run-uuid-123"

        # Prepare Keycloak user object
        try:
          keycloak_user = {
              "username": user_data['username'],
              "email": user_data['email'],
              "enabled": True,
              "emailVerified": False,
              "attributes": {
                  "legacy_userid": str(user_data['userid']),
                  "migration_source": "Xerafin 2"
              },
              "credentials": [ { "type": "password",
                                 "value": "password123",
                                 "temporary": True } ]
          }

          # Add optional fields
          if user_data.get('firstname'):
              keycloak_user["firstName"] = user_data['firstname']
          if user_data.get('lastname'):
              keycloak_user["lastName"] = user_data['lastname']

          # Add timestamps
          if user_data.get('created_at'):
              keycloak_user["attributes"]["legacy_created_at"] = user_data['created_at'].isoformat()
          if user_data.get('last_login'):
              keycloak_user["attributes"]["legacy_last_login"] = user_data['last_login'].isoformat()

          # Add preferences as separate attributes
          preferences = self.extract_preferences(user_data)
          for key, value in preferences.items():
              keycloak_user["attributes"][key] = value

          user_id = self.keycloak_admin.create_user(keycloak_user)

          self.logger.info(f"Created user {user_data['username']} -> {user_id}")
          return user_id

        except Exception as e:
            self.logger.error(f"Error creating user {user_data['username']}: {e}")
            return None

    def migrate_user(self, user_data: Dict) -> bool:
        """Migrate a single user"""
        legacy_id = user_data['userid']
        username = f'{user_data["firstname"]} {user_data["lastname"]}'
        email = user_data['email']

        self.logger.info(f"Processing user {legacy_id}: {email}")

        # Check if already tracked
        cursor = self.mysql_conn.cursor(mysql.cursors.DictCursor)
        cursor.execute(
            "SELECT keycloak_uuid, status FROM migration_progress WHERE userid = %s",
            (legacy_id,)
        )
        existing = cursor.fetchone()
        cursor.close()

        if existing and existing['status'] == 'success':
            self.logger.info(f"User {username} already migrated: {existing['keycloak_uuid']}")
            return True

        # Check if user already exists in Keycloak
        existing_uuid = self.user_exists_in_keycloak(username, email)
        if existing_uuid:
            self.logger.info(f"User {username} already exists in Keycloak: {existing_uuid}")
            self.record_migration(legacy_id, existing_uuid, username, email, 'success',
                                 {"note": "User already existed in Keycloak"})
            return True

        # Create user in Keycloak
        user_uuid = self.create_keycloak_user(user_data)

        if user_uuid:
            self.record_migration(legacy_id, user_uuid, username, email, 'success')
            return True
        else:
            self.record_migration(legacy_id, None, username, email, 'failed',
                                 {"error": "Failed to create user in Keycloak"})
            return False

    def record_migration(self, legacy_id: str, keycloak_uuid: Optional[str],
                        username: str, email: str, status: str,
                        details: Optional[Dict] = None):
        """Record migration result"""
        cursor = self.mysql_conn.cursor()

        query = """
        INSERT INTO migration_progress
        (userid, keycloak_uuid, username, email, status, details, migrated_at, retry_count)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), 1)
        ON DUPLICATE KEY UPDATE
            keycloak_uuid = VALUES(keycloak_uuid),
            status = VALUES(status),
            details = VALUES(details),
            migrated_at = NOW(),
            retry_count = retry_count + 1
        """

        details_json = json.dumps(details) if details else None

        cursor.execute(query, (legacy_id, keycloak_uuid, username, email, status, details_json))
        self.mysql_conn.commit()
        cursor.close()

    def run_migration(self):
        """Execute the migration"""
        self.logger.info("🚀 Starting user migration")
        self.logger.info(f"Mode: {'TEST (5 users)' if self.config.test_mode else 'FULL'}")
        self.logger.info(f"Dry run: {self.config.dry_run}")

        users = self.get_users_to_migrate()

        if not users:
            self.logger.info("No users to migrate")
            return

        total = len(users)
        success = 0
        failed = 0

        for i, user in enumerate(users, 1):
            self.logger.info(f"[{i}/{total}] Migrating: {user['email']}")

            if self.migrate_user(user):
                success += 1
            else:
                failed += 1

        # Generate report
        self.generate_report()

        self.logger.info(f"✅ Migration complete: {success} succeeded, {failed} failed")

        if self.config.test_mode:
            self.logger.info("🧪 Test mode complete. Review logs before full migration.")

    def generate_report(self):
        """Generate migration summary report"""
        cursor = self.mysql_conn.cursor(mysql.cursors.DictCursor)

        cursor.execute("""
        SELECT
            status,
            COUNT(*) as count,
            MIN(migrated_at) as first_migration,
            MAX(migrated_at) as last_migration
        FROM migration_progress
        GROUP BY status
        ORDER BY status
        """)

        report = cursor.fetchall()
        cursor.close()

        print("\n" + "="*60)
        print("📊 MIGRATION SUMMARY REPORT")
        print("="*60)

        for row in report:
            icon = "✅" if row['status'] == 'success' else "❌" if row['status'] == 'failed' else "⏳"
            print(f"{icon} {row['status']:10} {row['count']:>5} users")

        print("="*60)

        # Show some examples
        cursor = self.mysql_conn.cursor(mysql.cursors.DictCursor)
        cursor.execute("""
        SELECT username, email, keycloak_uuid, status
        FROM migration_progress
        WHERE status != 'pending'
        ORDER BY migrated_at DESC
        LIMIT 5
        """)

        recent = cursor.fetchall()
        cursor.close()

        if recent:
            print("\n📝 Recent migrations:")
            for item in recent:
                print(f"  {item['username']} -> {item['keycloak_uuid'] or 'N/A'} ({item['status']})")

def main():
    """Main entry point"""
    try:
        # Load and validate config
        config = Config().validate()

        # Initialize and run migration
        service = MigrationService(config)
        service.run_migration()

    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("\nPlease set the following environment variables:")
        print("  MYSQL_PWD, KEYCLOAK_ADMIN_PASSWORD")
        print("\nSee .env.example for all required variables.")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
