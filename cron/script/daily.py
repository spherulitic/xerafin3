#!/usr/local/bin/python

from keycloak import KeycloakOpenID
import requests
from datetime import datetime
import os
import math

print(f"Starting Daily Chat at {datetime.now()}")
KEYCLOAK_USER = os.environ.get("CRON_KUSER")
KEYCLOAK_PASS = os.environ.get("CRON_KPASS")
keycloak_openid = KeycloakOpenID(server_url="http://keycloak:8080/auth/",
                                 client_id="x-client",
                                 realm_name="Xerafin")

token = keycloak_openid.token(KEYCLOAK_USER, KEYCLOAK_PASS)
headers = {"Accept": "application/json", "Authorization": token['access_token']}

# Add daily summary to lb_summary -- stats service
url = 'http://stats:5000/dailySummary'
requests.post(url, headers=headers).json
print(f"Daily Updates Finished at {datetime.now()}")
