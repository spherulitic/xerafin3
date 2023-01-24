import sys
import os
import time
from datetime import datetime
import MySQLdb as mysql
from login import app

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB_LOGIN')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')

def debug(message):
  timestamp = datetime.now().strftime("%Y %m %d %H:%M:%S")
  app.logger.info(f"{__name__} {timestamp} {message}\n")

def getMysqlCon():
  return mysql.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)
