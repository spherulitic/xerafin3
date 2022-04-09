#!/usr/bin/python3

# TODO: blank cardbox quizzes

import MySQLdb as mysql
import sqlite3 as lite
import sys
import time
import math
import random
import string
import os
import itertools
import dawg_python as dawg
from xerafinUtil import xerafinUtil as xs
from datetime import datetime, timedelta

#   studyOrderIndex
#  closet
#  newWordsAtOnce
#  reschedHrs
#  showNumSolutions

# DIFFICULTY column in QUESTIONS table being used for status
# -1 : Immediately available to be sent by getQuestions()
# 0 : Unlocked
# 1 : Locked by Karatasi
# 2 : In the backlog
# 3 : Locked
# 4 : In the future, not eligible to be completed now

cardboxDBPath = "cardbox-data"

def getLexicon(userid):

  lexicon = "csw"
  with xs.getMysqlCon().cursor() as con:
    command = "select version from user_lexicon_master where userid = %s and lower(lexicon) = %s"
    con.execute(command, (userid, lexicon))
    version = con.fetchone()[0]
  return "{0}{1}".format(lexicon, version)

def getDBFile(userid):

  try:
    DBFile = os.path.join(sys.path[0], cardboxDBPath, userid + ".db")
    return DBFile
  except:
    return None

def getDBCur(userid):
  return lite.connect(getDBFile(userid)).cursor()
  
def getAllPrefs(userid):
  with xs.getMysqlCon().cursor() as con:
    command = "select studyOrderIndex, closet, newWordsAtOnce, reschedHrs, showNumSolutions, cb0max, showHints, schedVersion from user_prefs where userid = %s"
    con.execute(command, (userid,))
    row = con.fetchone()
    result = {}
    result["studyOrderIndex"] = row[0]
    result["closet"] = row[1]
    result["newWordsAtOnce"] = row[2]
    result["reschedHrs"] = row[3]
    result["showNumSolutions"] = row[4]
    result["cb0max"] = row[5]
    result["showHints"] = row[6]
    result["schedVersion"] = row[7]
  return result

def getPrefs (prefName, userid):
  with xs.getMysqlCon().cursor() as con:
    command = "select " + prefName + " from user_prefs where userid = %s" 
    con.execute(command, (userid,))
    return con.fetchone()[0]

def setPrefs2(prefName, userid, prefValue):
  with xs.getMysqlCon().cursor() as con:
    command = "update user_prefs set " + prefName + " = %s where userid = %s"
    try:
      con.execute(command, (prefValue, userid))
    except:
      return "Error updating user_prefs"
  return "success"
  
def setPrefs (userid,
    prefName = None,
    prefValue = None,
    studyOrderIndex = None,
    closet = None,
    newWordsAtOnce = None,
    reschedHrs = None,
    showNumSolutions = None):

# TODO: check to be sure the inputs are correct data type, etc
  with xs.getMysqlCon().cursor() as con:
    if prefName is not None:
      command = "update user_prefs set %s = %s where userid = %s"
      command.execute(command, (prefName, prefValue, userid))
    else:
      command = "select studyOrderIndex, closet, newWordsAtOnce, reschedHrs, showNumSolutions from user_prefs where userid = %s" 
      con.execute(command, (userid,))
      newPrefs = list(con.fetchone())
      if studyOrderIndex is not None:
        newPrefs[0] = studyOrderIndex
      if closet is not None:
        newPrefs[1] = closet
      if newWordsAtOnce is not None:
        newPrefs[2] = newWordsAtOnce
      if reschedHrs is not None:
        newPrefs[3] = reschedHrs
      if showNumSolutions is not None:
        newPrefs[4] = showNumSolutions
      command = "update user_prefs set studyOrderIndex = %s, closet = %s, newWordsAtOnce = %s, reschedHrs = %s, showNumSolutions = %s where userid = %s"
      con.execute(command, tuple(newPrefs) + (userid,))
    return "Success updating user preferences"

def getFromStudyOrder (numNeeded, userid, cur):
  result = [ ]
  studyOrderIndex = getPrefs("studyOrderIndex", userid)
  if numNeeded < 1:
    return result
  with xs.getMysqlCon().cursor() as mysqlcon:
    if mysqlcon is None:
      return result
    cur.execute("select question from questions where next_scheduled is not null union all select question from next_added")
    allQuestions = set([x[0] for x in cur.fetchall()])
    while len(result) < numNeeded:
      version = getLexicon(userid)[3:]
      mysqlcon.execute("select alphagram, studyOrderIndex from {0} where studyOrderIndex between %s and %s order by studyOrderIndex".format("studyOrder"+version), (studyOrderIndex, studyOrderIndex + 100))
      allStudyOrder = [row for row in mysqlcon.fetchall() if row[0] not in allQuestions]
      for row in allStudyOrder:
        result.append(row[0])
        studyOrderIndex = row[1]+1
        if len(result) >= numNeeded:
          break
      if len(allStudyOrder) == 0:
        studyOrderIndex = studyOrderIndex + 101
#      allStudyOrder = mysqlcon.fetchall()
#      studyOrder = list(set([x[0] for x in allStudyOrder]) - set(allQuestions))
#      try:
#        studyOrderIndex = min([x[1] for x in allStudyOrder if x[0] in studyOrder])
#      except:
#        studyOrderIndex = 0
#    command = "select alphagram from studyOrder where studyOrderIndex = %s"
#    while len(result) < numNeeded:
#      mysqlcon.execute(command, studyOrderIndex)
#      a = mysqlcon.fetchone()
#      if a is None:
#        return result
#      if a[0] in allQuestions:
#        pass
#      else:
#        result.append(a[0])
#      studyOrderIndex = studyOrderIndex + 1
  setPrefs(userid=userid, studyOrderIndex=studyOrderIndex)
  return result
  
def getCardboxScore (userid):

  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      cur.execute("select sum(cardbox) from questions where next_scheduled is not null")
      x = cur.fetchone()[0]
      if x is None:
        return "0"
      return str(x)
#  except lite.Error as e: 
#      return "sql error %s" % e.message  
#  except Exception as e:
#      return "non-sql error " + str(e)
  except:
    return "0"

def getEarliestDueDate(userid):
  now = int(time.time())
  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      command = "select min(next_scheduled) from questions where next_scheduled is not null and next_Scheduled > 0 and difficulty != 4"
      cur.execute(command)
      mns = cur.fetchone()[0]
      if mns > now:
        command = "select * from cleared_until"
        cur.execute(command)
        result = cur.fetchone()[0]
      else:
        result = mns
    return result
  except:
    return -1

def getCurrentDue (userid, summarize=False):
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  '''
  now = int(time.time())
  result = { }
  try:
    with lite.connect(getDBFile(userid)) as con :
      cur = con.cursor()
  # What's due excludes difficulty 4 so let's make that accurate
      futureSweep(cur)
      cur.execute("select * from cleared_until")
      clearedUntil = max(cur.fetchone()[0], now)
      if summarize:
        cur.execute("select count(*) from questions where next_scheduled < %d and cardbox is not null and difficulty != 4" % clearedUntil)
        result["total"] = cur.fetchone()[0]
      else:
        cur.execute("select cardbox, count(*) from questions where next_scheduled < %d and cardbox is not null and difficulty != 4 group by cardbox" % clearedUntil)
        for row in cur.fetchall():
          result[row[0]] = row[1]
    return result      
  except lite.Error as e: 
#      return  "sql error %s" % e.message  
      return {0: -1}
  except Exception as e:
#      return "non-sql error " + str(e)
      return {0: -2}

def getDueInRange(userid, start, end):
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  start and end are integers - unix epoch time
  '''
  result = { }
  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      statement = "select cardbox, count(*) from questions where next_scheduled between ? and ? and cardbox is not null group by cardbox"
      cur.execute(statement, (start, end))
      for row in cur.fetchall():
        result[row[0]] = row[1]
      return result      
  except lite.Error as e: 
#      return  "sql error %s" % e.message  
      return {0: -1}
  except Exception as e:
#      return "non-sql error " + str(e)
      return {0: -2, "start": start, "end": end}

def getDueByDay(userid, cardbox = None):
  '''
  Returns a dict: {date: numberDue, date: numberDue, etc}
  Cardbox will return only that cardbox number, or everything if None
  Note this isn't tested yet
  '''
  result = { }
  estart = datetime(1970, 1, 1, 0, 0) # First date of the Epoch
  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      statement = "select next_scheduled/86400, count(*) from questions ? group by next_scheduled/86400"
      if cardbox is None:
        cur.execute(statement, [""])
      else:
        cur.execute(statement, "where cardbox = %s".format(cardbox))
      for row in cur.fetchall():
        dt = estart + timedelta(days=row[0])
        due = row[1]
        result[dt] = due
    return result
  except lite.Error as e:
    return {estart: -1}
  except Exception as e:
    return {estart: -2}


def getTotal(userid):
  '''
  Returns an integer, number of cards in all cardboxes
  '''
  try:
    with lite.connect(getDBFile(userid)) as con :
      cur = con.cursor()
      command = "select count(*) from questions where next_scheduled is not null"
      cur.execute(command)
      result = cur.fetchone()[0]
    return result
  except:
    return -1

def getTotalByCardbox(userid):
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  '''
  result = { }
  try:
    with lite.connect(getDBFile(userid)) as con :
      cur = con.cursor()
      command = "select cardbox, count(*) from questions where next_scheduled is not null group by cardbox"
      cur.execute(command)
      for row in cur.fetchall():
        result[row[0]] = row[1]
      return result      
  except lite.Error as e: 
#      return  "sql error %s" % e.message  
      return {0: -1}
  except Exception as e:
#      return "non-sql error " + str(e)
      return {0: -2}

def getTotalByLength(userid):

  result = { }
  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      command = "select length(question), count(*) from questions where next_scheduled is not null group by length(question)"
      cur.execute(command)
      for row in cur.fetchall():
        result[row[0]] = row[1]
    return result
  except lite.Error as e:
    return {0: -1}
  except Exception as e:
    return {0: -2}


  
def getNext (newCardbox = 0, schedVersion = 0) :

  '''
  If you are putting a word in cardbox newCardbox now,
  returns the time (in Unix Epoch format) it needs to be reviewed
  '''
  now = int(time.time())
  day = 24*3600  # number of seconds in a day

  if newCardbox > 12 :
    newCardbox = 12

  random.seed()
  offset=random.randrange(day)

# List of lists 
# cardbox x is rescheduled for a time [x,y] 
# between x and x+y days in the future
  if schedVersion == 1:
    r = [ [.2, .3], [1, 1], [3, 3], [7, 7], [14, 14], [30,30], [60,45], [120, 90], [240, 120], [430, 100], [430,100], [430,100], [430,100] ]
  
  elif schedVersion == 3:
    r = [ [0.5,1] , [1,2] , [2,6] , [6,8] , [12,10] , [19,12] , [27,18] , [40,28] , [62,32] , [86,48] , [120,70] , [170,80] , [215,150] ]
  else:
    r = [ [.5,.8], [3,2], [5,4], [11,6], [16,10], [27,14], [50,20], [80,30], [130,40], [300,60], [430,100], [430,100],[430,100] ]
  
  return int( now + (r[newCardbox][0]*day) + (r[newCardbox][1]*offset))

def correct (alpha, userid, nextCardbox=None, quizid=-1) :

  if quizid == -1:
    now = int(time.time())
    schedVersion = getPrefs("schedVersion", userid)
    with lite.connect(getDBFile(userid)) as con :
  
      cur = con.cursor()
      if nextCardbox is None:
        cur.execute("select cardbox from questions where question='{0}'".format(alpha))
        currentCardbox = cur.fetchone()[0]
        nextCardbox = currentCardbox + 1
      cur.execute("update questions set cardbox = {0}, next_scheduled = {1}, correct=correct+1, streak=streak+1, last_correct = {2}, difficulty=4 where question = '{3}'".format(nextCardbox, getNext(nextCardbox, schedVersion), now, alpha))
  else:
    with xs.getMysqlCon().cursor() as con:
     con.execute("update quiz_user_detail set correct=1, incorrect=0, last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s and quiz_id = %s", (alpha, userid, quizid)) 


def wrong (alpha, userid, quizid=-1) :

  if quizid == -1:
    schedVersion = getPrefs("schedVersion", userid)
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      if schedVersion == 1 or schedVersion == 2 or schedVersion == 3:
        cur.execute("select cardbox from questions where question='{0}'".format(alpha))
        currentCardbox = cur.fetchone()[0]
      else: 
        currentCardbox = -1
      stmt = "update questions set cardbox = ?, next_scheduled = ?, incorrect = incorrect+1, streak=0, difficulty=4 where question = ?"
      if currentCardbox < 8:
        cur.execute(stmt, (0, getNext(0, schedVersion), alpha))
      else: 
        cur.execute(stmt, (2, getNext(2, schedVersion), alpha))
  else:
    with xs.getMysqlCon().cursor() as con:
       con.execute("update quiz_user_detail set incorrect=1, correct = 0, last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s and quiz_id = %s", (alpha, userid, quizid)) 

      

def skipWord (alpha, userid) :
  SKIP_DELAY = 3600*12 # twelve hour delay
  now = int(time.time())
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    command = "update questions set next_scheduled = max(next_scheduled + ?, ?), difficulty=4 where question = ?"
    cur.execute(command, (SKIP_DELAY, now+SKIP_DELAY, alpha))
  
def addWord (alpha, cur) :

  '''
  Add one word to cardbox zero - assumed to be valid
  '''
  now = int(time.time())  
  cur.execute("select count(*) from questions where question = ?", (alpha,))
  qCount = cur.fetchone()[0]
  if qCount == 0:
    command = "insert into questions (question, correct, incorrect, streak, last_correct, difficulty, cardbox, next_scheduled) values (?, 0, 0, 0, 0, -1, 0, ?)"
    cur.execute(command, (alpha, now))
    dbClean(cur)
  return qCount == 0

def addWords (numWords, userid, cur) :

  now = int(time.time())
  
# We assume everything in next_added and study_order is valid 

  dbClean(cur)
  cur.execute("select count(*) from next_added")
  nextAddedCount = cur.fetchone()[0]
  cur.execute("select question from next_added order by timeStamp limit ?", (numWords,))
  result = cur.fetchall()
  if result is not None:
    wordsToAdd = [x[0] for x in result]
    for word in wordsToAdd:
      addWord(word, cur)
  if numWords > nextAddedCount:
    x = getFromStudyOrder(numWords-nextAddedCount, userid, cur)
    for alpha in x:
      addWord(alpha, cur)

def getNextAddedCount(userid):
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select count(*) from next_added")
    return cur.fetchone()[0]

  
def insertIntoNextAdded(alphagrams, userid, cur):
  '''
  Takes in a list of alphagrams to add to next_added
  Checks to make sure it's a valid alphagram
  '''
    
  now = int(time.time())
  command = "insert into next_added (question, timeStamp) values (?, ?)"
  for alpha in alphagrams:
    if isAlphagramValid(alpha, userid):
      try:
        cur.execute(command, (alpha, now))
      except:
        pass
  dbClean(cur)

def getAllNextAdded(userid):

  result = [ ]
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select question, timeStamp from next_added order by timestamp")
    for row in cur.fetchone():
      result.append({"alpha": row[0], "timestamp": row[1]})
  return result

def deleteNextAdded(alphas, cur):
 '''
 Takes a list of alphagrams to delete from next_added
 '''
 placeholder = ', '.join('?'*len(alphas)) 
 sql = "delete from next_added where question in ({})".format(placeholder)
 cur.execute(sql, (alphas,))
 return cur.rowcount
  
def nextAddedMoveToFront(alphas, cur):
 ''' 
 Takes a list of alphagrams to move to the front of the queue
 '''
 cur.execute("select min(timestamp) from next_added")
 minT = cur.fetchone()[0]
 placeholder = ', '.join('?'*len(alphas)) 
 sql = "update next_added set timeStamp = ? where question in ({})".format(placeholder)
 cur.execute(sql, [minT-1].extend(alphas))
 return cur.rowcount

def nextAddedMoveToBack(alphas, cur):
 ''' 
 Takes a list of alphagrams to move to the back of the queue
 '''
 cur.execute("select max(timestamp) from next_added")
 maxT = cur.fetchone()[0]
 placeholder = ', '.join('?'*len(alphas)) 
 sql = "update next_added set timeStamp = ? where question in ({})".format(placeholder)
 cur.execute(sql, [maxT+1].extend(alphas))
 return cur.rowcount

def isAlphagramValid(alpha, userid):
  lexicon = getLexicon(userid) 
  chCommand = "select count(*) from " + lexicon + " where alphagram = %s"
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      con.execute(chCommand, [alpha]) 
      return con.fetchone()[0] > 0
    else:
      return False
  return False

def ghostbuster(userid):
   with lite.connect(getDBFile(userid)) as con:
     cur = con.cursor()
     cur.execute("select question from questions")
     rows = cur.fetchall()
     for row in rows:
       if isAlphagramValid(row[0], userid):
         pass
       else:
         cur.execute("delete from questions where question = ?", (row[0],))


def dbClean (cur) :

# Make sure that the database is in a good state. Things happen.

  cur.execute("delete from next_added where question in (select question from questions where next_scheduled is not null)")
  cur.execute("update questions set difficulty = null where cardbox is null")

    
def closetSweep (cur, userid) :

# Note this will unlock anything locked with difficulty 3

  now = int(time.time())
  closet = getPrefs("closet", userid)
  cur.execute("update questions set difficulty = 0 where cardbox < {0} and difficulty != 1".format(closet))
  cur.execute("update questions set difficulty = 2 where cardbox >= {0} and difficulty != 1 and next_scheduled < {1}".format(closet, now))

def futureSweep(cur) :
  """
  Sets things to difficulty 4 which are in the future but are in a cardbox too low to be quizzed now
  Only moves difficulty 0 and -1 -> 4
  Note difficulty 2 and 4 are exclusive
  """
  now = int(time.time())
  cur.execute("update questions set difficulty = 0 where difficulty in (4, 50)")
  # Anything in cardbox 10 or higher we can see 30 days ahead of schedule
  cur.execute("update questions set difficulty = 4 where cardbox >= 10 and next_scheduled > ?+(3600*24*30) and difficulty in (0, -1)", (now,))
  # Anything in cardbox N; 1 <= N <= 9; we can see N days ahead of schedule
  cur.execute("update questions set difficulty = 4 where cardbox < 10 and next_scheduled > ?+(cardbox*3600*24) and difficulty in (0, -1)", (now,))

def makeWordsAvailable (userid, cur) :
  """
  Sets words with difficulty = -1 to be used by getQuestions
  Used by getQuestions 
  """
  now = int(time.time())
  reschedHrs = getPrefs("reschedHrs", userid)
  cb0max = getPrefs("cb0max", userid)

  cur.execute("select max(cardbox) from questions")
  try: 
    maxCardbox = cur.fetchone()[0]
    if maxCardbox is None:
      maxCardbox = 0
    if maxCardbox >= 10:
      maxCardbox = 30
  except:
    maxCardbox = 0
  soonestNewWordsAt = now + (3600*reschedHrs)
  maxReadAhead = max(now + (maxCardbox*3600*24), soonestNewWordsAt+60) 
  cur.execute("select * from cleared_until")
  clearedUntil = max([cur.fetchone()[0], now])
  cur.execute("select * from new_words_at")
  newWordsAt = max([cur.fetchone()[0], soonestNewWordsAt])
  if clearedUntil < newWordsAt:
    clearedUntil = clearedUntil + 3600
  else: 
    cur.execute("select count(*) from questions where cardbox = 0")
    cb0cnt = cur.fetchone()[0]
    cur.execute("select count(*) from questions where difficulty != 4 and next_Scheduled is not null")
    readycnt = cur.fetchone()[0]
    # if readycnt = 0, there are no words available to repeat so we must add new
    #   even overriding newWordsAtOnce = 0 or cb0max
    if readycnt == 0:
      addWords(max(getPrefs("newWordsAtOnce", userid),1), userid, cur)
# reintroduced this bug by request. fix it once there's a "quiz from CB 0" bit
# fixed this darned bug
#      addWords(getPrefs("newWordsAtOnce", userid), userid, cur)
    elif cb0cnt < cb0max:
      addWords(getPrefs("newWordsAtOnce", userid), userid, cur)
    newWordsAt = newWordsAt + 3600
  if clearedUntil > now:
    futureSweep(cur)
    cur.execute("update questions set difficulty = -1 where question in (select question from questions where difficulty = 2 order by cardbox, next_scheduled limit 10)")
  cur.execute("update questions set difficulty = -1 where difficulty = 0 and next_scheduled < %s" % clearedUntil)
  cur.execute("update new_words_at set timeStamp = {0}".format(min(newWordsAt,maxReadAhead)))
  cur.execute("update cleared_until set timeStamp = {0}".format(min(clearedUntil, maxReadAhead+1)))

def newQuiz (userid):
  now = int(time.time())
  checkCardboxDatabase(userid)
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    dbClean(cur)
    cur.execute("select * from cleared_until")
    clearedUntil = cur.fetchone()[0]
    closetSweep(cur, userid)
    futureSweep(cur)
    command = "update questions set difficulty = -1 where difficulty = 0 and next_scheduled < ?"
    cur.execute(command, (max(now, clearedUntil),))

def getBingoFromCardbox (userid, cardbox=0):
  """
  Returns a list of alphagrams that are due, length 7 or greater
  """
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select question from questions where cardbox is not null and length(question) >= 7 and difficulty in (-1,0,2) order by case cardbox when ? then -2 else difficulty end, cardbox, next_scheduled limit 1", (cardbox,))
    result = cur.fetchone()
    if result is not None: 
      return result[0]
    cur.execute("select question from next_added where length(question) >= 7 order by timeStamp limit 1")
    result = cur.fetchone()
    if result is not None:
      addWord(result[0], cur)
      return result[0]
    # need to get from study order
    studyOrderIndex = getPrefs("studyOrderIndex", userid)
    cur.execute("select question from questions where cardbox is not null and length(question) >= 7")
    allCardboxBingos = [ x[0] for x in cur.fetchall() ]
    version = getLexicon(userid)[3:]
    with xs.getMysqlCon().cursor() as mysqlcon:
      mysqlcon.execute("select alphagram from {0} where length(alphagram) >= 7 and studyOrderIndex > %s order by studyOrderIndex".format("studyOrder"+version), (studyOrderIndex,))
      for row in mysqlcon.fetchall():
        if row[0] not in allCardboxBingos:
          addWord(row[0], cur)
          return row[0]
  return None
    
     
def getQuestions (numNeeded, userid, cardbox, questionLength=None, isCardbox=True, quizid=-1) :
  """
  Returns a dict with a quiz of numNeeded questions in the format { "Alphagram" -> [ Word, Word, Word ] }
  """
  quiz = {}
  allQuestions = []
  if isCardbox:

    # Cardbox doesn't filter, it only prioritizes one cardbox over others
    # If you specifically ask for a cardbox in the backlog, ignore backlogging
    closet = getPrefs("closet", userid)
    if cardbox >= closet:
      diffToGet = (-1,2)
      dFormat = "?,?"
    else:
      diffToGet = (-1,)
      dFormat = "?"
    with lite.connect(getDBFile(userid)) as qCon:
      cur = qCon.cursor()
      getCardsQry = "select question from questions where difficulty in ({0}) and next_scheduled is not null order by case cardbox when ? then -1 else cardbox end, next_scheduled limit ?".format(dFormat)
      cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
      result = cur.fetchall()
      while (len(result) < numNeeded):
     #  if questionLength is None:
        makeWordsAvailable(userid, cur)
        cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
        result = cur.fetchall()
     #  else:
     #    makeWordsAvailableWithFilter(numNeeded, questionLength)
      allQuestions = [x[0] for x in result]
  else:  # non cardbox quiz
    getCardsQry = "select alphagram from quiz_user_detail where quiz_id = %s and user_id = %s and locked = 0 and completed = 0 limit %s"
    with xs.getMysqlCon().cursor() as con:
      con.execute(getCardsQry, (quizid, userid, numNeeded))
      allQuestions = [x[0] for x in con.fetchall()]
  for alpha in allQuestions:
    quiz[alpha] = getAnagrams(alpha, userid)
  return quiz

##def makeWordsAvailableWithFilter (numNeeded, questionLength=None):
##  """
##  Returns a quiz in the format { "Alphagram" -> [Word, Word, Word] }
##  Filtered quizzes will read ahead but will not add new words (for now)
##  Filtered quizzes ignore the backlog flag (since there's no new words)
##  """
##
##  now = int(time.time())
##  numAvailable = 0
##  futureSweep()
##
##  with lite.connect(getDBFile(userid)) as con:
##    cur = con.cursor()
##
##    cur.execute("update questions set difficulty = -1 where question in (select question from questions where length(question) = {0} and difficulty in (-1,0,2) order by next_scheduled limit {1})".format(questionLength, numNeeded))

def getDef (word, userid) :
  
  lexicon = getLexicon(userid) 

  with xs.getMysqlCon().cursor() as con:
    if con is None:
      return " "
    command = "select definition from " + lexicon + " where word = %s"
    con.execute(command, [word])
    try:
      return con.fetchone()[0]
    except:
      return " "

def getAnagrams (alpha, userid) :
  '''
  Takes in an alphagram and returns a list of words
  '''
  lexicon = getLexicon(userid) 
  x = []
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      command = "select word from " + lexicon + " where alphagram = %s"
      con.execute(command, [alpha])
      for row in con.fetchall():
        x.append(row[0])
  return x

#1##def getAnagramsWithHooks (alpha) :
#1##  x = []
#1##  with lite.connect(A_DB_PATH) as con:
#1##    cur = con.cursor()
#1##    cur.execute("select front_hooks, word, back_hooks from words where alphagram = '{0}'".format(alpha))
#1##    return cur.fetchall()
#1##
def getHooks (word, userid) :
  '''
  Takes in a word
  Returns a tuple (front hooks, word, lexicon_symbols, back hooks)
  '''
  lexicon = getLexicon(userid)
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      command = "select front_hooks, word, lexicon_symbols, back_hooks from " + lexicon + " where word = %s"
      con.execute(command, [word]) 
      return con.fetchone()
    else:
        return (None, None, None, None)

def getAuxInfo (alpha, userid):
  '''
  Returns dict: {"cardbox": x, "nextScheduled": x, "correct": x, 
      incorrect: x, difficulty: x }
  '''
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select cardbox, next_scheduled, correct, incorrect, difficulty from questions where question = '{0}' and next_scheduled is not null".format(alpha))
    result = cur.fetchall()
    if len(result) > 0:
      return {"cardbox": result[0][0], "nextScheduled": result[0][1], "correct": result[0][2], "incorrect": result[0][3], "difficulty": result[0][4] }
    else:
      return {}

def powerset (alpha):
  '''
  Takes an alphagram and returns a list of all possible subsets
    of length 2 or more
  '''
  return [ u''.join(a) for a in itertools.chain.from_iterable([itertools.combinations(alpha, r) for r in range(2,len(alpha)+1)])]

def getSubanagrams (alpha, userid):
  '''
  Takes a valid alphagram. Returns a list with all alphagrams that make 
   valid words which are a valid subset of the alphagram
  '''
  filename = getLexicon(userid) + '.dawg'
  d = dawg.CompletionDAWG().load(filename)
  result = [ ]
  for x in powerset(alpha):
    if x in d and x not in result:
      result.append(x)
  return result

def getValidBlanagrams (alpha) :

# Takes an alphagram. Returns a list with all alphagrams that make 
# valid words with the input plus a blank

  alphaDawg = dawg.CompletionDAWG().load('alpha.dawg')
  result = []
  for char in string.uppercase:
    x = u''.join(sorted(alpha + char))
    if x in alphaDawg:
      result.append(x)

  return result

def getBlanagramQuestion (alpha, userid) :
  
# Takes an alphagram
# Returns a list of valid questions with that alphagram plus blank
# [ alpha: xxx, words: [ word, word, word ], auxInfo: { ... } ]

  result = [ ]

  for question in getValidBlanagrams(alpha):
    result.append({ "alpha": question, "words": getAnagrams(question, userid), "auxInfo": getAuxInfo(question, userid)})
  return result

def checkCardboxDatabase (userid):

  now = int(time.time())
  try:
    pass
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      cur.execute("select name from sqlite_master where type='table'")
      tables = [x[0] for x in cur.fetchall()]
      if u'questions' not in tables:
        cur.execute("create table questions (question varchar(16), correct integer, incorrect integer, streak integer, last_correct integer, difficulty integer, cardbox integer, next_scheduled integer)")
      if u'cleared_until' not in tables:
        cur.execute("create table cleared_until (timeStamp integer)")
      if u'new_words_at' not in tables:
        cur.execute("create table new_words_at (timeStamp integer)")
      if u'next_Added' not in tables:
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

  except:
    return False
  return True
  
def getDots (word, userid) :
  '''
  takes in a word, returns a list of two booleans
  does the word lose the front / back letter and still make a word?
  '''
  lexicon = getLexicon(userid)
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      command = "select count(*) from " + lexicon + " where word = %s"
      con.execute(command, [word[1:]])
      numFront = con.fetchone()[0]
      con.execute(command, [word[:-1]])
      numBack = con.fetchone()[0]
  return [numFront > 0, numBack > 0]


def checkOut (alpha, userid, lock, isCardbox=True, quizid=-1) :
   """
   if LOCK is true, set difficulty = 3 (locked)
   if LOCK is false, set difficulty = 0
   locks are cleared by closetSweep() and newQuiz()
   """
   if isCardbox:
     if lock:
       difficulty = 3
     else:
       difficulty = 0
  
     with lite.connect(getDBFile(userid)) as con:
       cur = con.cursor()
       cur.execute("update questions set difficulty = ? where question = ?", (difficulty, alpha))
   else:
     with xs.getMysqlCon().cursor() as con:
       con.execute("update quiz_user_detail set locked = %s where quiz_id = %s and user_id = %s and alphagram = %s", (int(lock), quizid, userid, alpha))

def isInCardbox(alpha, userid) :

   with lite.connect(getDBFile(userid)) as con:
     cur = con.cursor()
     cur.execute("select count(*) from questions where question = ? and next_scheduled is not null", (alpha,))
     c = cur.fetchone()[0]
   return c==1

