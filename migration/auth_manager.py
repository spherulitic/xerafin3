from keycloak import KeycloakAdmin
import requests
import time
import logging
import os
from typing import Optional

class KeycloakAuthManager:
    """Manages authentication with Keycloak using admin credentials"""

    def __init__(self):
        self.realm = 'Xerafin'
        self.token = None
        self.token_expiry = 0
        self.logger = logging.getLogger(__name__)
        # initialise the admin client
        try:
          self.admin_client = KeycloakAdmin(
                     server_url="http://keycloak:8080/",
                     realm_name=self.realm,
                     client_id=os.environ.get('KEYCLOAK_USER'),
                     client_secret_key=os.environ.get('KEYCLOAK_PASSWORD'),
                     verify=False
                     )
          self.token_expiry = time.time() + 300 # assume five minutes
          self.logger.info("KeycloakAdmin client initialized.")
        except Exception as e:
          self.logger.error(f"Failed to initialize KeycloakAdmin: {e}")
          return None

    def test_connection(self) -> bool:
        """Test if we can connect to Keycloak"""
        try:
          realm_info = self.admin_client.get_realm(self.realm)
          return realm_info is not None
        except:
          return False
