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
  return "Xerafin Login Service"

@app.route("/getUserLexicons", methods=['GET', 'POST'])
def getUserLexicons():
  result = { }
  result["status"] = "success"
  try:
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

  except:
    xu.errorLog()
    result["status"] = "error"

  return jsonify({"values": result, "default": {"lexicon": "CSW", "version": "21"}})

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

  try:
    result = { }
    result["status"] = "success"
    now = int(time.time())

  # get attributes from keycloak. If they don't exist, set defaults
  #
  # studyOrderIndex  0
  # closet    20
  # newWordsAtOnce  4
  # reschedHrs    24
  # showNumSolutions  'Y' <-- currently ununsed I think
  # cb0max    200
  # schedVersion  0
  # secLevel    1 <-- actual access level, replaced by roles?
  # isTD    0 <-- also currently unused I think
  # firstLogin    CURDATE <-- account creation time?
  # countryId    0
  # lexicon    'csw'
  # lexiconVersion  21

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
