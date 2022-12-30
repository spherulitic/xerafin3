import sys
import os
import traceback
import time
from datetime import datetime
import MySQLdb as mysql
from quiz import app

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')

def errorLog():
  timestamp = datetime.now().strftime("%Y %m %d %H:%M:%S")
  app.logger.error(f"{__name__} {timestamp}\n")
  exc_type, exc_obj, tb = sys.exc_info()
  stack = traceback.extract_tb(tb) # list of FrameSummary type
  for frame in stack:
    app.logger.error(f'EXCEPTION IN {frame.filename}, LINE {frame.lineno}\n "{frame.line.strip()}": {exc_obj}\n\n')

def debug(message):
  timestamp = datetime.now().strftime("%Y %m %d %H:%M:%S")
  app.logger.info(f"{__name__} {timestamp} {message}\n")

def getMysqlCon():
  return mysql.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)

def getDomain():
  return ""
