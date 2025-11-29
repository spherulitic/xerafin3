'''Xerafin sloth module'''

import os
import urllib
import json
import requests
from logging.config import dictConfig
from functools import lru_cache
import jwt # pylint: disable=E0401
from flask import jsonify, request, g # pylint: disable=E0401
import xerafinUtil.xerafinUtil as xu
from sloth import app

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

  # headers to send to other services
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  g.con = lite.connect(getDBFile())
  g.cur = g.con.cursor()

  return None

@app.after_request
def close_sqlite(response):
  '''Close the cursor to the cardbox database'''
  # In a crash, g.con might not have been set up correctly
  if hasattr(g, 'con') and g.con:
    g.con.commit()
    g.con.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Sloth Service"

@app.route("/getAnagrams", methods=['GET', 'POST'])
def getAnagramsView():
  params = request.get_json(force=True)
  alpha = params.get('alpha')
  return None
