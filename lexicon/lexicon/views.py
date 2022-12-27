'''Xerafin lexicon module'''

from flask import jsonify, request, Response, g, session
import urllib
import json
import requests
import jwt
from logging.config import dictConfig
from pymongo import MongoClient
import sys
import time
import xerafinUtil.xerafinUtil as xu
from lexicon import app

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

  client = MongoClient('mongodb://lexicon-db:27017/')
  g.words = client['lexicon']['words']

  return None

@app.after_request
def close_mysql(response):
  g.con.close()
  g.mysqlcon.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Lexicon Service"

# Each word in mongodb is a document with the following structure:
#   front_hooks
#   word
#   back_hooks
#   alphagram
#   definition

@app.route("/getAlphagramCounts", methods=['GET'])
def getAlphagramCounts():
  ''' need to rewrite this using mongodb '''
  try:
    result = { }
#    stmt = "select length(alphagram), count(distinct alphagram) from words group by length(alphagram)"
#    g.con.execute(stmt)
#    result = dict([(row[0], row[1]) for row in g.con.fetchall()])
  except:
    xu.errorLog()
    result = { }
  return jsonify(result)

@app.route("/getAnagrams", methods=['GET', 'POST'])
def getAnagrams():
  '''Take in one alphagram and return the valid words associated.'''
  # Someday may want to implement this with the DAWG
  result = [ ]
  try:
    params = request.get_json(force=True)
    alpha = params.get('alpha')
    query = {"alphagram": alpha}
    result = g.words.find(query)
    return [x["word"] for x in result]
  except:
    xu.errorLog()
  return jsonify(result)
