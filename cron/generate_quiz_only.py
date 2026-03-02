#!/usr/bin/env python3
"""
Script to manually run only the generatePeriodicQuizzes part of the cron
"""

import sys
import os
import json
import traceback
from datetime import datetime
from time import sleep

import requests
from keycloak import KeycloakOpenID
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure retry strategy for network requests
RETRY_STRATEGY = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "POST"]
)

def setup_logging():
    """Print startup information"""
    print(f"\n{'='*60}")
    print(f"Manual Quiz Generation - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    sys.stdout.flush()

def create_session_with_retries():
    """Create a requests session with retry logic"""
    session = requests.Session()
    adapter = HTTPAdapter(max_retries=RETRY_STRATEGY)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def get_keycloak_token():
    """Authenticate with Keycloak and return token"""
    print("\n[1/2] Authenticating with Keycloak...")

    KEYCLOAK_USER = os.environ.get("CRON_KUSER")
    KEYCLOAK_PASS = os.environ.get("CRON_KPASS")

    if not KEYCLOAK_USER or not KEYCLOAK_PASS:
        raise ValueError("CRON_KUSER or CRON_KPASS environment variables not set")

    keycloak_openid = KeycloakOpenID(
        server_url="http://keycloak:8080/",
        client_id="x-client",
        realm_name="Xerafin"
    )

    try:
        token = keycloak_openid.token(KEYCLOAK_USER, KEYCLOAK_PASS)
        print(f"✓ Authentication successful (expires in: {token.get('expires_in', 'unknown')}s)")
        return token['access_token']
    except Exception as e:
        print(f"✗ Authentication failed: {e}")
        raise

def make_request(session, method, url, headers=None, json_data=None, description=""):
    """Make HTTP request with error handling"""
    try:
        print(f"  Requesting: {url}")
        response = session.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            timeout=30
        )
        response.raise_for_status()

        if response.status_code == 200:
            print(f"  ✓ Success (Status: {response.status_code})")
            return response
        else:
            print(f"  ⚠ Warning (Status: {response.status_code})")
            return response

    except requests.exceptions.Timeout:
        print(f"  ✗ Timeout connecting to {url}")
        raise
    except requests.exceptions.ConnectionError:
        print(f"  ✗ Connection error to {url}")
        raise
    except requests.exceptions.HTTPError as e:
        print(f"  ✗ HTTP error: {e.response.status_code} - {e.response.text[:200]}")
        raise
    except Exception as e:
        print(f"  ✗ Unexpected error: {e}")
        raise

def generate_period_quizzes(session, headers: dict) -> bool:
    """Generate quizzes for all applicable periods"""
    print(f"\n[2/2] Generating quizzes...")

    quiz_url = 'http://quiz:5000/generatePeriodicQuizzes'
    try:
        make_request(
            session,
            "POST",
            quiz_url,
            headers=headers,
            description="Period quiz generation"
        )
        return True
    except Exception as e:
        print(f"  ✗ Period quiz generation failed: {e}")
        return False

def main():
    """Main execution function"""
    start_time = datetime.now()
    session = None

    try:
        setup_logging()

        # Step 1: Get authentication token
        access_token = get_keycloak_token()
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}"
        }

        # Create session with retries
        session = create_session_with_retries()

        # Step 2: Generate quizzes
        quiz_success = generate_period_quizzes(session, headers)

        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\n{'='*60}")
        if quiz_success:
            print(f"✓ Quiz generation completed successfully in {duration:.1f} seconds")
        else:
            print(f"✗ Quiz generation FAILED after {duration:.1f} seconds")
        print(f"  Started: {start_time.strftime('%H:%M:%S')}")
        print(f"  Finished: {end_time.strftime('%H:%M:%S')}")
        print(f"{'='*60}\n")

        sys.stdout.flush()

        return 0 if quiz_success else 1

    except KeyboardInterrupt:
        print("\n✗ Script interrupted by user")
        return 130
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"✗ FATAL ERROR: {type(e).__name__}")
        print(f"  Error: {e}")
        print(f"\nTraceback:")
        traceback.print_exc()
        print(f"{'='*60}")
        sys.stdout.flush()
        return 1
    finally:
        if session:
            session.close()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
