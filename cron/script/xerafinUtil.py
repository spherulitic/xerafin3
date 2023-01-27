#/usr/bin/python

import xerafinSetup as xs
import sqlite3 as lite
import linecache
import os, sys
from datetime import datetime

def errorLog(module):
  log = open('logs/error.log', 'a')
  log.write("\n{}\n{}\n".format(module, datetime.now().strftime("%Y %m %d %H:%M:%S")))
  exc_type, exc_obj, tb = sys.exc_info()
  f = tb.tb_frame
  lineno = tb.tb_lineno
  filename = f.f_code.co_filename
  linecache.checkcache(filename)
  line = linecache.getline(filename, lineno, f.f_globals)
  log.write('EXCEPTION IN {}, LINE {}\n "{}": {}\n\n'.format(filename, lineno, line.strip(), exc_obj))
  log.close()

def debugLog(module):
  log = open('logs/debug.log', 'a')
  log.write("\n{}\n{}\n".format(module, datetime.now().strftime("%Y %m %d %H:%M:%S")))
  return log

def getTokenFromCookies():

  c = { } #dictionary of cookies
  if "HTTP_COOKIE" in os.environ:
    cookie_list = os.environ["HTTP_COOKIE"].split(";")
    for cookie_string in cookie_list:
      try:
        key, value = cookie_string.split('=')
      except:
        continue # skip cookies with = in value
      c[key.strip()] = value.strip()
    if c.get("XSESSID"):
      return c["XSESSID"]
    else:
      return None

def getUseridFromCookies():
  sessionid = getTokenFromCookies()
  if sessionid:
    return str(getUseridFromToken(sessionid))
  else:
    return None

def getUseridFromToken(token):

  mysqlcon = xs.getMysqlCon()
  con = mysqlcon.cursor()
  stmt = "select userid from login where token = %s"
  con.execute(stmt, [token])
  try:
    userid = con.fetchone()[0]
    return str(userid)
  except:
    return None

  con.close()
  mysqlcon.close()
