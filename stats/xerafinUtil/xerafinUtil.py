import MySQLdb as mysql
import os
import sys
import time
from datetime import datetime
from stats import app

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB_STATS')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')

def debug(message):
  app.logger.info("{} {} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S"), message))

def getMysqlCon():
   return mysql.connect(host=MYSQL_HOST, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)
