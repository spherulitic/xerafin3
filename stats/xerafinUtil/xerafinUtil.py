import MySQLdb as mysql
import os
import sys
import time
from datetime import datetime
from stats import app

MYSQL_USER = os.environ.get('MYSQL_USER')
MYSQL_DB = os.environ.get('MYSQL_DB')
MYSQL_PWD = os.environ.get('MYSQL_PWD')
MYSQL_HOST = os.environ.get('MYSQL_HOST')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT',3306))

def debug(message):
  app.logger.info("{} {} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S"), message))

def getMysqlCon():
   return mysql.connect(host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, passwd=MYSQL_PWD, db=MYSQL_DB)

class DownstreamError(Exception):
  '''Raised when a downstream service returns an error we must propagate
     (e.g. a 401) back to the client, which will refresh its token and retry.'''
  def __init__(self, status_code, body):
    super().__init__(f"Downstream service returned {status_code}: {body}")
    self.status_code = status_code
    self.body = body

def check401(response):
  '''Pass through non-401 responses; otherwise raise DownstreamError with the
     downstream error body so the 401 propagates to the client.'''
  if response.status_code == 401:
    try:
      body = response.json()
    except Exception:
      body = {'error': 'Unauthorized'}
    raise DownstreamError(401, body)
  return response
