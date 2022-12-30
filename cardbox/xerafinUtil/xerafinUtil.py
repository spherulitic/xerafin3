from flask import request
import sqlite3 as lite
import linecache
import os, sys, traceback
import time
from datetime import datetime
from cardbox import app

cardboxDBPath = "cardbox-data"

def errorLog():
  app.logger.error("{} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S")))
  exc_type, exc_obj, tb = sys.exc_info()
  stack = traceback.extract_tb(tb) # list of FrameSummary type
  for frame in stack:
    app.logger.error('EXCEPTION IN {}, LINE {}\n "{}": {}\n\n'.format(frame.filename, frame.lineno, frame.line.strip(), exc_obj))

def debug(message):
  app.logger.info("{} {} {}\n".format(__name__, datetime.now().strftime("%Y %m %d %H:%M:%S"), message))

def getDBFile(userid):

  try:
    DBFile = os.path.join(sys.path[0], cardboxDBPath, userid + ".db")
    return DBFile
  except:
    return None

def checkCardboxDatabase (userid):

  now = int(time.time())
#  try:
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select name from sqlite_master where type='table'")
    tables = [x[0] for x in cur.fetchall()]
    if 'questions' not in tables:
      cur.execute("create table questions (question varchar(16), correct integer, incorrect integer, streak integer, last_correct integer, difficulty integer, cardbox integer, next_scheduled integer)")
    if 'cleared_until' not in tables:
      cur.execute("create table cleared_until (timeStamp integer)")
    if 'new_words_at' not in tables:
      cur.execute("create table new_words_at (timeStamp integer)")
    if 'next_Added' not in tables:
      cur.execute("create table next_Added (question varchar(16), timeStamp integer)")
    cur.execute("create unique index if not exists question_index on questions(question)")
    cur.execute("create unique index if not exists next_added_question_idx on next_added(question)")

    cur.execute("select * from cleared_until")
    row = cur.fetchone()
    if row is None:
      cur.execute("insert into cleared_until values (?)", (now,))

    cur.execute("select * from new_words_at")
    row = cur.fetchone()
    if row is None:
      cur.execute("insert into new_words_at values (?)", (now+1,))

#  except:
#    return False

  return True

def getDomain():
  return ""
