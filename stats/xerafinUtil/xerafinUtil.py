from flask import request
import MySQLdb as mysql
import linecache
import os, sys, traceback
import time
from datetime import datetime
from stats import app

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

def getMysqlCon():
   return mysql.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)
