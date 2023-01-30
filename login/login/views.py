from logging.config import dictConfig
from keycloak import KeycloakAdmin
import urllib
import json
import jwt
import requests
import os
import datetime
import time
from flask import Flask, request, jsonify, Response, g
from login import app
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

@app.route("/", methods=['GET'])
def index():
  return jsonify(["Xerafin Login Service"])

@app.route('/setCardboxPrefs', methods=['POST'])
def setCardboxPrefs():
  ''' Take cardbox prefs from the client and update keycloak attributes '''
  keycloak_admin = KeycloakAdmin(server_url="http://keycloak:8080/auth/",
                      username=os.environ.get('KEYCLOAK_USER'),
                      password=os.environ.get('KEYCLOAK_PASSWORD'),
                      realm_name='Xerafin',
                      client_id='admin-cli'
                      )
  user = keycloak_admin.get_user(g.uuid)

  params = request.get_json(force=True)
  att = user['attributes']
  if 'cb0max' in params:
    att['cb0max'] = [ params.get('cb0max') ]
  if 'closet' in params:
    att['closet'] = [ params.get('closet') ]
  if 'newWordsAtOnce' in params:
    att['newWordsAtOnce'] = [ params.get('newWordsAtOnce') ]
  if 'reschedHrs' in params:
    att['reschedHrs'] = [ params.get('reschedHrs') ]
  if 'schedVersion' in params:
    att['schedVersion'] = [ params.get('schedVersion') ]

  resp = keycloak_admin.update_user(g.uuid, user)
  return jsonify(resp)

@app.route("/getCountries", methods=['GET', 'POST'])
def countries():
  result = { }
  query = "SELECT countryid, name, short from countries"
# I think this query was going to be used for country-level aggregation metrics
#   unusedquery = """SELECT countrid, name, short, count(distinct countryId) as most from countries, user_prefs
#                   WHERE countrid = countryId GROUP BY countryid ORDER BY most DESC, LIMIT 5"""
  g.con.execute(query)
  rows = g.con.fetchall()
  rows = [{"id": r[0], "name": r[1], "short": r[2]} for r in rows]
  result["byId"] = sorted(rows, key = lambda d: d["id"])
  result["byName"] = sorted(rows, key = lambda d: d["name"])

  return jsonify(result)

@app.route("/getLoggedInUsers", methods=['GET', 'POST'])
def getLoggedInUsers():
  ' Called via AJAX and returns photo URL, name, and last active time of all logged in users '
  result = [ ]
  keycloak_admin = KeycloakAdmin(server_url="http://keycloak:8080/auth/",
                      username=os.environ.get('KEYCLOAK_USER'),
                      password=os.environ.get('KEYCLOAK_PASSWORD'),
                      realm_name='Xerafin',
                      client_id='admin-cli'
                      )

  clientId = keycloak_admin.get_client_id('x-client')
  sessions = keycloak_admin.get_client_all_sessions(clientId)
  sessionList = [{"userId": x["userId"], "lastAccess": x["lastAccess"]} for x in sessions]
  for row in sessionList:
    userInfo = keycloak_admin.get_user(row["userId"])
    if userInfo['username'] == 'chris@xerafin.net':
      # This is the service account
      continue
    row["name"] = f'{userInfo["firstName"]} {userInfo["lastName"]}'
    row["photo"] = userInfo['attributes'].get('photo', 'images/unknown_player.gif')
    result.append(row)

  return jsonify(result)

@app.route('/getUserNamesAndPhotos', methods=['GET', 'POST'])
def getUserNamesAndPhotos():
  ''' Takes in a list of uuids
      Returns a list of dicts
      [ {"userid": uuid, "name": name, "photo": photo}, { .... } ]
  '''
  result = [ ]
  params = request.get_json(force=True) # returns dict
  uuidList = params.get('userList', [ ])
  keycloak_admin = KeycloakAdmin(server_url="http://keycloak:8080/auth/",
                      username=os.environ.get('KEYCLOAK_USER'),
                      password=os.environ.get('KEYCLOAK_PASSWORD'),
                      realm_name='Xerafin',
                      client_id='admin-cli'
                      )
  for uuid in uuidList:
    userDict = {'userid': uuid}
    if uuid == '0': # System user -- not in keycloak
      userDict["name"] = 'Xerafin'
      userDict['photo'] = 'images/unknown_player.gif'
    else:
      userInfo = keycloak_admin.get_user(uuid)
      userDict["name"] = f'{userInfo["firstName"]} {userInfo["lastName"]}'
      userDict["photo"] = userInfo['attributes'].get('photo', 'images/unknown_player.gif')
    result.append(userDict)

  return jsonify(result)

@app.route("/getUserLexicons", methods=['GET', 'POST'])
def getUserLexicons():
  '''Returns the lexicon / version that a user is configured for.
      Right now Xerafin only supports CSW, but (at times) multiple editions.
      In theory someday we can support multiple languages but this may be tricky
  '''
  result = { }
  result["status"] = "success"
  # eventually when we have multiple language support, this will be a list of results
  # for now we assume one
  query = f'select lexicon, version from user_lexicon_master where userid = "{g.uuid}"'
  g.con.execute(query)
  row = g.con.fetchone()
  if row is None:
    userLex = 'CSW' # hard coded default; fix this someday
    userVersion = '21'
    query = f'''insert into user_lexicon_master (userid, lexicon, version)
             values ("{g.uuid}", "{userLex}", "{userVersion}")'''
    g.con.execute(query)
  else:
    userLex = row[0]
    userVersion = row[1]

  query = f'''SELECT name, country, replaced_by
              FROM lexicon_info l
             WHERE lexicon = "{userLex+userVersion}"'''
  g.con.execute(query)
  row = g.con.fetchone()
  result["name"] = row[0]
  result["country"] = row[1]
  result["replaced_by"] = row[2]
  result["lexicon"] = userLex
  result["version"] = userVersion

  return jsonify({"values": [result], "default": {"lexicon": "CSW", "version": "21"}})

@app.route("/getNavbar", methods=['GET'])
def getNavbar():

  contents = [
    {'title': 'Basic Quiz', 'onClick': 'overview.setGoAction({context:"MY",value:0});overviewUI.update("MY_GO_SET_DEFAULT",0);overviewUI.update("SEARCH_GO_SET_DEFAULT",0);overview.go("MY");', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Subword Sloth!', 'onClick': 'initSloth()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Cardbox Invaders', 'onClick': 'initInvaders()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Wall of Words', 'onClick': 'overview.setGoAction({context:"MY",value:1});overviewUI.update("MY_GO_SET_DEFAULT",1);overviewUI.update("SEARCH_GO_SET_DEFAULT",1);overview.go("MY");', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Widgets', 'onClick': '', 'hasChildren': True, 'privLevel': 1, 'lastChild': False, 'new': False},
#    {'title': 'Cardbox & Chill', 'onClick': 'initTogether()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': True},
    {'title': 'Cardbox', 'onClick': 'showCardboxStats()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Alphagram Info', 'onClick': 'showAlphaStats(toAlpha($.trim(prompt("Enter a word or alphagram to display"))))', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Rankings', 'onClick': 'initLeaderboard()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Debug', 'onClick': 'initDebug()', 'hasChildren': False, 'privLevel': 42, 'lastChild': False, 'new': True},
    {'title': 'Game Stats', 'onClick': 'showGameStats()', 'hasChildren': False, 'privLevel': 1, 'lastChild': True, 'new': False},
#    {'title': 'TSH feed', 'onClick': 'initTournamentStandings()', 'hasChildren': False, 'privLevel': 1, 'lastChild': True, 'new': True},
    {'title': 'Settings', 'onClick': '', 'hasChildren': True, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'User Prefs', 'onClick': 'initUserPrefs()', 'hasChildren': False, 'privLevel': 1, 'lastChild': False, 'new': False},
    {'title': 'Manage Words to Add', 'onClick': '', 'hasChildren': False, 'privLevel': 60, 'lastChild': False, 'new': True},
    {'title': 'Logout', 'onClick': 'logoutUser()', 'hasChildren': False, 'privLevel': 1, 'lastChild': True, 'new': False},
    {'title': 'Admin', 'onClick': '', 'hasChildren': True, 'privLevel': 60, 'lastChild': False, 'new': False},
    {'title': 'Manage', 'onClick': 'initManageUsers()', 'hasChildren': False, 'privLevel': 60, 'lastChild': False, 'new': True},
    {'title': 'Manage Users', 'onClick': 'initOldManageUsers()', 'hasChildren': False, 'privLevel': 60, 'lastChild': True, 'new': False}
  ]
  result = '''<div class="container-fluid">
    <nav class="navbar navbar-inverse navbar-fixed-top metalBThree" id="xeraNav">
      <img class="navbar-brand noselect" src="images/xerafinNew.png" style="height:50px;padding:5px!important;background:transparent;vertical-align:middle;">
      <div class="navbar-header" style="padding:0px!important;margin:0px!important;">
      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
          <span class="icon-bar"></span>
        </button>
      </div>
      <div class="collapse navbar-collapse" id="myNavbar">
        <ul class="nav navbar-nav " style="vertical-align:middle;" id="menuList">'''

  nest=0
  for value in contents:

    values = navbarCreateElement(value, nest)
    result = f'{result} {values[0]}'
    nest = values[1]

  kofiWidget = "<li style='margin-top:5px!important;'> <span id='kofiWidget'></span></li>"
  result = f'''{result}
        <script type='text/javascript'>
          kofiwidget2.init('Support Xerafin', 'rgba(140,176,48,0.95)', 'V7V11H3Z1');
          document.getElementById('kofiWidget').innerHTML = kofiwidget2.getHTML();
          $('.kofi-button').addClass('metalBOne');
        </script>'''
  result = f'{result} {kofiWidget}'
  result = f'{result} </ul></div></nav></div>'
  return result

@app.route("/login", methods=['GET', 'POST'])
def web_login():
  ''' to be removed by issue #109 '''
  return jsonify({"status": "success"})

def navbarCreateElement(arr, nest):
  # eventually privLevel will be replaced with mapping navbar items to keycloak roles
  if arr['privLevel'] == 1:
    if arr['hasChildren']:
      line = f"<li class='dropdown'><a href='#' class='dropdown-toggle' data-toggle='dropdown'>{arr['title']}<b class='caret'></b></a>\n"
      line = f"{line}<ul class='dropdown-menu'>\n"
      nest += 1
    else:
      if arr['new']:
        newtext = "<span style='color:red'>&nbsp;NEW!</span>"
      else:
        newtext = ""
      line = f"<li><a href='#' onClick='{arr['onClick']}'>{arr['title']}{newtext}</a></li>\n"
    if arr['lastChild'] and nest!=0:
      line = f"{line}</ul>\n</li>\n"
      nest = nest - 1
  else:
    line = ""

  return line, nest
