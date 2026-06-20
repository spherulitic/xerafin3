from math import ceil
from logging.config import dictConfig
from datetime import datetime, timedelta
from functools import lru_cache
from MySQLdb.cursors import DictCursor
import json
import urllib
import requests
import jwt
import time
from typing import Dict, Any, Tuple, Optional
from flask import request, jsonify, g
from dateutil.relativedelta import relativedelta, MO
import traceback
import xerafinUtil.xerafinUtil as xu
from stats import app

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]
PERIODS = ["daily","weekly","monthly","yearly"] + DAYS + MONTHS
RANKING_PERIODS = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth",
                   "lastMonth", "thisYear", "lastYear", "eternity"]

AWARDS_DIR = '/app/awards'

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})

@lru_cache(maxsize=1)
def get_public_key():
    public_key_url = 'http://keycloak:8080/realms/Xerafin'
    with urllib.request.urlopen(public_key_url) as r:
        public_key = json.loads(r.read())['public_key']
        return f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''

@app.before_request
def get_user():
  # Skip verification for public routes
  if request.endpoint in ['health']:
    return

  try:
    public_key = get_public_key()
    raw_token = request.headers.get("Authorization")
    if not raw_token:
      return jsonify({'error': 'Authorization header missing'}), 401
    if raw_token.startswith('Bearer '):
      raw_token = raw_token[7:]

    auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
    g.uuid = auth_token["sub"]
    g.name = auth_token.get("name", "Unknown")

    g.photo = auth_token.get('cardboxPrefs', {}).get('photo', 'images/unknown_player.gif')
    g.countryId = auth_token.get('cardboxPrefs', {}).get('countryId', 0)
    g.handle = auth_token.get('preferred_username', g.name)
    # headers to send to other services
    g.headers = {"Accept": "application/json", "Authorization": raw_token}

    g.mysqlcon = xu.getMysqlCon()
    g.con = g.mysqlcon.cursor()

    return None

  except jwt.ExpiredSignatureError:
    return jsonify({'error': 'Token has expired'}), 401
  except jwt.InvalidTokenError as e:
    return jsonify({'error': f'Invalid token: {str(e)}'}), 401
  except KeyError as e:
    return jsonify({'error': f'Missing required token field: {str(e)}'}), 401
  except urllib.error.URLError as e:
    return jsonify({'error': f'Cannot reach authentication service: {str(e)}'}), 503
  except Exception as e:
    return jsonify({'error': f'Authentication failed: {str(e)}'}), 401