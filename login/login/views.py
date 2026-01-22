from logging.config import dictConfig
from keycloak import KeycloakAdmin
from functools import lru_cache
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

  # headers to send to keycloak
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  g.mysqlcon = xu.getMysqlCon()
  g.con = g.mysqlcon.cursor()

  return None

@app.after_request
def close_mysql(response):
  g.mysqlcon.commit()
  g.con.close()
  g.mysqlcon.close()
  return response

@app.route("/", methods=['GET'])
def index():
  return jsonify(["Xerafin Login Service"])

@app.route('/createCardboxPrefs', methods=['POST'])
def createCardboxPrefs():
  ''' Create default cardbox prefs for a given user. '''
  keycloak_admin = getKeycloakAdmin()
  user = keycloak_admin.get_user(g.uuid)
  # if user['attributes'] doesn't exist we need to set it to the reference att
  att = user.get('attributes', { })
  user['attributes'] = att

  # params here is an array of prefs we need to create
  params = request.get_json(force=True)
  DEFAULT_PREFS = { "closet": 20, "newWordsAtOnce": 4,
        "reschedHrs": 24, "showNumSolutions": "Y", "cb0max": 200, "schedVersion": 0,
        "countryId": 0, "lexicon": "csw", "lexiconVersion": 24 }
  for pref in params:
    default = DEFAULT_PREFS.get(pref)
    if default is not None:
      att[pref] = default

  resp = keycloak_admin.update_user(g.uuid, user)
  return jsonify(resp)

@app.route('/setCardboxPrefs', methods=['POST'])
def setCardboxPrefs():
  ''' Take cardbox prefs from the client and update keycloak attributes '''
  keycloak_admin = getKeycloakAdmin()
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
  if 'countryId' in params:
    att['countryId'] = [ params.get('countryId') ]

  resp = keycloak_admin.update_user(g.uuid, user)
  return jsonify(resp)

@app.route("/getCountries", methods=['GET', 'POST'])
def countries():
  result = { }
  query = "SELECT countryid, name, short from countries"
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
  keycloak_admin = getKeycloakAdmin()
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
  result = []
  not_found_users = []  # Track users not found in Keycloak

  try:
    params = request.get_json(force=True, silent=True)
    if params is None:
      app.logger.error("Invalid JSON received in getUserNamesAndPhotos")
      return jsonify({"error": "Invalid JSON payload"}), 400

    uuidList = params.get('userList', [])

    if not uuidList:
      app.logger.warning("Empty userList received")
      return jsonify(result)

    keycloak_admin = getKeycloakAdmin()

    for uuid in uuidList:
      userDict = {'userid': uuid}

      if uuid in ['0', '1']:  # System user -- not in keycloak
        userDict["name"] = 'Xerafin'
        userDict['photo'] = 'images/xerafin2.png'
        userDict['countryId'] = 0
        result.append(userDict)
        continue

      try:
        userInfo = keycloak_admin.get_user(uuid)
        userDict["name"] = f'{userInfo["firstName"]} {userInfo["lastName"]}'
        userDict["photo"] = userInfo['attributes'].get('photo', 'images/unknown_player.gif')
        userDict["countryId"] = userInfo['attributes'].get('countryId', 0)
        result.append(userDict)

      except Exception as user_error:
        # Check if it's a "user not found" error
        error_msg = str(user_error).lower()
        if 'not found' in error_msg or '404' in error_msg:
          not_found_users.append(uuid)
          app.logger.warning(f"User not found in Keycloak: {uuid}")

          # Return default values for missing users
          userDict["name"] = 'Unknown User'
          userDict["photo"] = 'images/unknown_player.gif'
          result.append(userDict)
        else:
          # Re-raise unexpected errors
          app.logger.error(f"Unexpected error fetching user {uuid}: {user_error}")
          raise

    # Log summary if any users weren't found
    if not_found_users:
      app.logger.info(f"Users not found in Keycloak: {', '.join(not_found_users)}")

    return jsonify(result)

  except Exception as e:
    app.logger.error(f"Critical error in getUserNamesAndPhotos: {e}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500

@app.route("/getUserLexicons", methods=['GET', 'POST'])
def getUserLexicons():
  '''Returns the lexicon / version that a user is configured for.
      Right now Xerafin only supports CSW, but (at times) multiple editions.
      In theory someday we can support multiple languages but this may be tricky
  '''
  result = { }
  # eventually when we have multiple language support, this will be a list of results
  # for now we assume one
  query = f'select lexicon, version, is_default from user_lexicon_master where userid = "{g.uuid}"'
  g.con.execute(query)
  row = g.con.fetchone()
  if row is None:
    lexicon = 'CSW' # hard coded default; fix this someday
    version = '24'
    default = 1
    query = f'''insert into user_lexicon_master (userid, lexicon, version, is_default)
             values ("{g.uuid}", "{lexicon}", "{version}", {default})'''
    g.con.execute(query)
  else:
    lexicon = row[0]
    version = row[1]
    default = row[2]

  query = f'''SELECT name, country, replaced_by
              FROM lexicon_info l
             WHERE lexicon = "{lexicon+version}"'''
  g.con.execute(query)
  row = g.con.fetchone()
  result["name"] = row[0]
  result["country"] = row[1]
  result["replaced_by"] = row[2]
  result["lexicon"] = lexicon
  result["version"] = version
  result["default"] = default
  result["update"] = '24' # latest version of the lexicon. Hardcoded for now

  return jsonify([result])

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

def getKeycloakAdmin():
  ''' return a keycloak_admin object to access the keycloak API '''
  return KeycloakAdmin(server_url="http://keycloak:8080/",
                      realm_name='Xerafin',
                      client_id=os.environ.get('KEYCLOAK_USER'),
                      client_secret_key=os.environ.get('KEYCLOAK_PASSWORD'),
                      verify=False
                      )
