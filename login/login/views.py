from login import app
from flask import Flask, request, jsonify, Response
from logging.config import dictConfig
import sys
from http import cookies
import bcrypt
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

@app.route("/test")
def test():
  return "Hello World"

@app.route("/", methods=['POST'])
def webLogin():

  result = { }
  cookie = None
  now = int(time.time())

  mysqlcon = xu.getMysqlCon()
  con = mysqlcon.cursor()

# read the cookies. If we are sent a valid session ID, just say "successful" stop
  try:
    sessionid = xu.getTokenFromCookies()
    if sessionid:
      stmt = "select count(*) from login where token = %s"
      con.execute(stmt, [sessionid])
      cnt = con.fetchone()[0]
      if cnt == 1:
        raise Exception("session found") 
    
    try: 
      params = request.get_json(force=True)
      email = params["user"]
      password = params["pass"]
    except:
      raise Exception("no session found")

    stmt = "select password, userid, firstname, lastname, photo from user_auth where email = %s and active = 'Y'"
    con.execute(stmt, [email])
    try:
      output = con.fetchone()
      phash = output[0]
      userid = output[1]
      firstname = output[2]
      lastname = output[3]
      photo = output[4]
      if bcrypt.checkpw(password.encode('utf-8'), phash.encode('utf-8')):
        xu.debug("Password match")
        result["status"] = "success"

      # generate a token and set it as a cookie to send to client
        token = os.urandom(16).hex()
        exp = datetime.datetime.now() + datetime.timedelta(days=7)
        cookie = {"key": "XSESSID", "value": token, "expires": exp, "domain": "dev.localhost", "path": "/", "httponly": True, "secure": True, "samesite": "Strict"}
      
      # delete and insert into login table
        con.execute("delete from login where userid = %s", [userid])
        stmt = "insert into login (userid, last_login, last_active, token, name, photo, firstname, lastname) values (%s, %s, %s, %s, %s, %s, %s, %s)"
        con.execute(stmt, [userid, now, now, token, "{} {}".format(firstname, lastname), photo, firstname, lastname])
      # Check if they have user preferences; if not insert defaults
        command = "select count(*) from user_prefs where userid = %s"
        con.execute(command, (userid,))
        if con.fetchone()[0] == 0:
          command = "insert into user_prefs (userid, studyOrderIndex, closet, newWordsAtOnce, reschedHrs, showNumSolutions, cb0max, schedVersion, secLevel, isTD, firstLogin, countryId, lexicon) values (%s, 0, 20, 4, 24, 'Y', 200, 0, 1, 0, CURDATE(),0, 'csw')"
          con.execute(command, (userid,))

        
      #check if they have a lexicon version for default
        command = "select count(*) from user_lexicon_master where userid = %s and lexicon = %s"
        con.execute(command, (userid,'csw'))  # csw is default
        if con.fetchone()[0] == 0:
          command = "insert into user_lexicon_master (userid, lexicon, version) values (%s, %s, %s)"
          con.execute(command, (userid,'csw', '21'))
      # check that the cardbox database is set up
       
        if not xu.checkCardboxDatabase(userid):
          result["status"] = "Corrupted Cardbox Database Detected!"
  
      else:
        result["status"] = "mismatch"
    except:
      result["status"] = "mismatch"
      xu.errorLog()

  except Exception as ex:
    xu.debug(ex.args[0])
    if ex.args[0] == "session found":
      result["status"] = "success"
    elif ex.args[0] == "no session found":
      result["status"] = "no session found"
    else:
      xu.errorLog()
      result["status"] = "An error occurred. See log for more details"

  con.close()
  mysqlcon.commit()
  mysqlcon.close()

  response = jsonify(result)
  if cookie:
    response.set_cookie(**cookie)
  return response

