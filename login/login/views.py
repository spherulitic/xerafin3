from login import app
from flask import Flask, request, jsonify, Response, g
from logging.config import dictConfig
import urllib, json, jwt, requests
import sys
import datetime
import time
import os
import MySQLdb as mysql
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
  g.auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = g.auth_token["sub"]


  return None


@app.route("/", methods=['POST'])
def index():
  return "Xerafin Login Service"

@app.route("/getNavbar", methods=['GET'])
def getNavbar():
  return(g.auth_token)

@app.route("/login", methods=['GET', 'POST'])
def web_login():

  try:
    result = { }
    result["status"] = "success"
    now = int(time.time())

  # get attributes from keycloak. If they don't exist, set defaults
  #
  # studyOrderIndex	0
  # closet		20
  # newWordsAtOnce	4
  # reschedHrs		24
  # showNumSolutions	'Y' <-- currently ununsed I think
  # cb0max		200
  # schedVersion	0
  # secLevel		1 <-- actual access level, replaced by roles?
  # isTD		0 <-- also currently unused I think
  # firstLogin		CURDATE <-- account creation time?
  # countryId		0
  # lexicon		'csw'
  # lexiconVersion	21

  # firstname, lastname, photo

  # will keycloak keep a log of user logins?

  # check that the cardbox database is set up
  # this needs to be moved to the cardbox service and called there

#  if not xu.checkCardboxDatabase(userid):
#     result["status"] = "Corrupted Cardbox Database Detected!"
#
#      else:
#        result["status"] = "mismatch"
#    except:
#      result["status"] = "mismatch"
#      xu.errorLog()

  except:
    xu.errorLog()
    result["status"] = "An error occurred. See log for more details"

  return jsonify(result)
