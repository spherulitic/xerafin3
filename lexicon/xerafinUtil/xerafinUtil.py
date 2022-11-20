from flask import request
import MySQLdb as mysql
import linecache
import os, sys, traceback
import time
from datetime import datetime
from lexicon import app

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')

def errorLog():
  app.logger.error("{} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S")))
  exc_type, exc_obj, tb = sys.exc_info()
  stack = traceback.extract_tb(tb) # list of FrameSummary type
  for frame in stack:
    app.logger.error('EXCEPTION IN {}, LINE {}\n "{}": {}\n\n'.format(frame.filename, frame.lineno, frame.line.strip(), exc_obj))

def debug(message):
  app.logger.info("{} {} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S"), message))

def updateActive (userid, timestamp=None) :
  if timestamp is None:
    timestamp = int(time.time())
  mysqlcon = getMysqlCon()
  con = mysqlcon.cursor()
  try:
    command = "update login set last_active = %s where userid = %s"
    if (userid != 0):  # 0 is the system user
      con.execute(command, (timestamp, userid))
  except mysql.Error as e:
     result["status"] = "MySQL error %d %s " % (e.args[0], e.args[1])
  con.close()
  mysqlcon.commit()
  mysqlcon.close()


def getMysqlCon():
   return mysql.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)

def getDomain():
  return ""