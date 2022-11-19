'''Xerafin lexicon module'''

from lexicon import app
from flask import jsonify, request, Response, g, session
import urllib
import json
import requests
import jwt
from logging.config import dictConfig
import sys
import time
import xerafinUtil.xerafinUtil as xu

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


@app.before_request
def get_user():
  public_key_url = 'http://keycloak:8080/auth/realms/Xerafin'
  with urllib.request.urlopen(public_key_url) as r:
    public_key = json.loads(r.read())['public_key']
    public_key = f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''
  raw_token = request.headers["Authorization"]
  auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = auth_token["sub"]

  g.mysqlcon = xu.getMysqlCon()
  g.con = g.mysqlcon.cursor()

  return None

@app.after_request
def close_mysql(response):
  g.con.close()
  g.mysqlcon.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Lexicon Service"

@app.route("/getAlphagramCounts", methods=['GET'])
def getAlphagramCounts():
  try:
    result = { }
    stmt = "select length(alphagram), count(distinct alphagram) from words group by length(alphagram)"
    g.con.execute(stmt)
    result = dict([(row[0], row[1]) for row in g.con.fetchall()])
  except:
    xu.errorLog()
    result = { }
  return jsonify(result)
