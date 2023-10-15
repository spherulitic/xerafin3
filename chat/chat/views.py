''' Xerafin Chat service. This contains endpoints relating the to chat widget on the site.
    Includes access to the chat-related tables in the MySQL database and chat spool files
     which are used for long polling.
'''
from logging.config import dictConfig
import urllib
import json
import os
import time
import requests
import jwt
from flask import request, jsonify, g
from . import app, db
from . import logger
from .models import Chat

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
  ''' Validate the user token signature. Put the requestor uuid in a global.
      Open a MySQL connection as a global for the session.
  '''
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

  return None

@app.after_request
def close_mysql(response):
  return response

@app.route("/", methods=['POST'])
def index():
  return "Xerafin Chat Service"

@app.route('/getChatsInit', methods=['GET', 'POST'])
def getChatsInit():

  params = request.get_json(force=True) # returns dict
  error = {"status": "success"}
  result = [ ]
  now = int(params.get('mostRecent', time.time() * 1000))

  chatFile = os.path.join(CHAT_DIR, f'{g.uuid}.chat')
  open(chatFile, 'w').close()
  queryResult = db.session.scalars(db.select(Chat).where(Chat.timeStamp>now).order_by(Chat.timeStamp.asc()))
  allResults = [ ]
  # queryResult closes the result set after first access
  for row in queryResult:
    allResults.append(row)

  url = 'http://login:5000/getUserNamesAndPhotos'
  data = {'userList': [x.userid for x in allResults] } # list of userids
  response = requests.post(url, headers=g.headers, json=data).json()

  for row in allResults:
    myInfo = [x for x in response if x["userid"] == row.userid]
    if myInfo:
      photo = myInfo[0].get('photo')
      name = myInfo[0].get('name')
    else:
      photo = None
      name = None
    outRow = {"chatDate": row.timeStamp, 'photo': photo, 'name': name, 'chatText': row.message,
              'chatUser': row.userid, 'expire': False}
    result.append(outRow)

  return jsonify([result, 0, time.time() * 1000, error])

@app.route('/getChats', methods=['GET', 'POST'])
def getChats():
  ''' Long poll request to monitor for new chats. Returns after 45 seconds
       or when a new chat comes in. '''

  params = request.get_json(force=True) # returns dict
  lastReadRow = params.get('rownum')

  error = {"status": "success"}
  result = [ ]
  maxTries = 45
  tryDelay = 1.0 # in seconds
  tries = 0
  time.sleep(4)
  chatFile = os.path.join(CHAT_DIR, f'{g.uuid}.chat')
  with open(chatFile, 'r') as f:
    lineCounter = 0
    while lineCounter < lastReadRow:
      f.readline()
      lineCounter = lineCounter + 1
    while tries < maxTries:
      line = f.readline()
      if line:
        while line:
          result.append(appendChatToResult(line))
          line = f.readline()
          lastReadRow = lastReadRow + 1
        break
      time.sleep(tryDelay)
      tries = tries + 1

  return jsonify([result, lastReadRow, time.time() * 1000, error])

@app.route('/submitChat', methods=['GET', 'POST'])
def submitChat():
  ''' submits a chat '''

  params = request.get_json(force=True) # returns dict
  result = { }
  kw = { }
  userid = params.get('userid', g.uuid)
  message = params.get('chatText', '')
  kw['chatTime'] = int(params.get('chatTime', time.time() * 1000))
  kw['expire'] = params.get('expire', False)
  kw['milestoneType'] = params.get('milestoneType')
  kw['milestoneOf'] = params.get('milestoneOf')

  result = post(userid, message, **kw)
  return jsonify(result)

def appendChatToResult(line):
  temp = line.split(',')
  userid = temp[0]
  timeStamp = temp[1]
  message = ','.join(temp[2:]).strip()
  expire = not message

  url = 'http://login:5000/getUserNamesAndPhotos'
  data = { 'userList': [ userid ] }
  response = requests.post(url, headers=g.headers, json=data).json()
  photo = response[0].get('photo', 'images/unknown_player.gif')
  name = response[0].get('name')

  return {"chatDate": int(timeStamp), "photo": photo, "name": name,
          "chatText": message, "chatUser": userid, "expire": expire}

def post(userid, message, **kwargs):
  ''' posts a chat. chatTime is in milliseconds -- epoch*1000 '''
  # kwargs can include chatTime, expire (default False), milestoneType,
  #  milestoneOf

  result = { }
  expire = kwargs.get('expire', False)

  # this is a little kludgy
  # bad data spooled to the chat file hoses everything
  if userid is None:
    return {"status": "Chat Missing Userid"}

  msg = [ ]

  if expire:
    # These lines will tell the front end to delete from display
    queryResult = db.session.scalars(db.select(Chat).where(Chat.milestoneType==kwargs['milestoneType'] and
      Chat.milestoneOf==kwargs['milestoneOf']))
    for row in queryResult:
      msg.append(f'0,{row.timeStamp},\n')
      db.session.delete(row)
      db.session.commit()

  chat = Chat()
  chat.userid = userid
  chat.timeStamp = kwargs.get('chatTime')
  chat.message = message
  chat.milestoneType = kwargs.get('milestoneType')
  chat.milestoneOf = kwargs.get('milestoneOf')
  db.session.add(chat)
  db.session.commit()
  msg.append(f'{userid},{str(kwargs["chatTime"])},{message}\n')
  result["msg"] = msg

  # get all active userid sessions here
  url = 'http://login:5000/getLoggedInUsers'
  resp = requests.get(url, headers=g.headers).json()
  loggedInUsers = [ x['userId'] for x in resp ]
  for user in loggedInUsers:
    filename = os.path.join(CHAT_DIR, f'{user}.chat')
    with open(filename, 'a') as f:
      for line in msg:
        f.write(line)
  result["status"] = "success"

  return result
