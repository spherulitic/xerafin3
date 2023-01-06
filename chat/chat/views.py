from logging.config import dictConfig
import urllib
import json
import jwt
import requests
import os
import datetime
import time
from flask import Flask, request, jsonify, Response, g
from chat import app
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

CHAT_DIR = '/app/chatdata'

@app.before_request
def get_user():
  public_key_url = 'http://keycloak:8080/auth/realms/Xerafin'
  with urllib.request.urlopen(public_key_url) as r:
    public_key = json.loads(r.read())['public_key']
    public_key = f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''
  g.raw_token = request.headers["Authorization"]
  g.auth_token = jwt.decode(g.raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = g.auth_token["sub"]

  # headers to send to keycloak
  g.headers = {"Accept": "application/json", "Authorization": g.raw_token}

  g.mysqlcon = xu.getMysqlCon()
  g.con = g.mysqlcon.cursor()

  return None

@app.after_request
def close_mysql(response):
  g.con.close()
  g.mysqlcon.close()
  return response

@app.route("/", methods=['POST'])
def index():
  return "Xerafin Chat Service"

@app.route('/getChatsInit', methods=['GET', 'POST'])
def getChatsInit():

  params = request.get_json(force=True) # returns dict
  error = {"status": "success"}
  result = [ ]
  now = int(params.get('mostRecent', time.time()))

  chatFile = os.path.join(CHAT_DIR, f'{g.uuid}.chat')
  open(chatFile, 'w').close()
  command = """SELECT timeStamp, message, chat.userid
               FROM chat
               WHERE timeStamp > %s
               ORDER BY timeStamp ASC"""

  g.con.execute(command, (now,))
  queryResult = g.con.fetchall()
  url = 'http://login:5000/getUserNamesAndPhotos'
  data = { 'userList': [ x[2] for x in queryResult ] } # list of userids
  response = requests.post(url, headers=g.headers, json=data).json()

  for row in queryResult:
    myInfo = [x for x in response if x["userid"] == row[2]]
    photo = myInfo['photo']
    name = myInfo['name']
    outRow = {"chatDate": row[0], 'photo': photo, 'name': name, 'chatText': row[1],
              'chatUser': row[2], 'expire': False}
    result.append(outRow)

  return jsonify([result, 0, int(time.time()), error])
