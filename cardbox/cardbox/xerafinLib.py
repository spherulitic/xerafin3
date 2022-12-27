'''xerafinLib is a library of functions that abstracts access to a user's cardbox,
     the dictionary database, and user preferences. '''

from datetime import datetime, timedelta
import sys
import time
import random
import string
import os
import itertools
import sqlite3 as lite
import dawg_python as dawg
from xerafinUtil import xerafinUtil as xs

#  studyOrderIndex
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

CARDBOX_DB_PATH = "cardbox-data"


def getDBFile(userid):
  ''' Return path to the user's cardbox sqlite DB file
  '''
  dbFile = os.path.join(sys.path[0], CARDBOX_DB_PATH, userid + ".db")
  return dbFile

def getDBCur(userid):
  ''' Return a sqlite DB connection to the user's cardbox
  '''
  return lite.connect(getDBFile(userid)).cursor()

def getAllPrefs(userid):
  ''' Returns a dict with all user preferences
  '''
  with xs.getMysqlCon().cursor() as con:
    command = ("select studyOrderIndex, closet, newWordsAtOnce, reschedHrs, " +
      "showNumSolutions, cb0max, showHints, schedVersion " +
      "from user_prefs where userid = %s")
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
  ''' Returns the value of the requested user preference
  '''
  with xs.getMysqlCon().cursor() as con:
    command = "select " + prefName + " from user_prefs where userid = %s"
    con.execute(command, (userid,))
    return con.fetchone()[0]

def setPrefs2(prefName, userid, prefValue):
  ''' Takes in a preference name and value, and updates for the user
  '''
  with xs.getMysqlCon().cursor() as con:
    command = "update user_prefs set " + prefName + " = %s where userid = %s"
    con.execute(command, (prefValue, userid))
  return "success"

def setPrefs (userid,
    prefName = None,
    prefValue = None,
    studyOrderIndex = None,
    closet = None,
    newWordsAtOnce = None,
    reschedHrs = None,
    showNumSolutions = None):
  ''' Takes in a pref as a paramter and sets it
  '''

# need to: check to be sure the inputs are correct data type, etc
  with xs.getMysqlCon().cursor() as con:
    if prefName is not None:
      command = "update user_prefs set %s = %s where userid = %s"
      con.execute(command, (prefName, prefValue, userid))
    else:
      command = ("select studyOrderIndex, closet, newWordsAtOnce, reschedHrs, " +
        "showNumSolutions from user_prefs where userid = %s")
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
      command = ("update user_prefs set studyOrderIndex = %s, closet = %s, " +
        "newWordsAtOnce = %s, reschedHrs = %s, showNumSolutions = %s where userid = %s")
      con.execute(command, tuple(newPrefs) + (userid,))
    return "Success updating user preferences"

def getFromStudyOrder (numNeeded, userid, cur):
  ''' Returns the next numNeeded alphagrams from study order. Excludes questions
        already in cardbox or in next_added
      Lord help me, I need to reimplement this from scratch
  '''
  result = [ ]
  studyOrderIndex = getPrefs("studyOrderIndex", userid)
  if numNeeded < 1:
    return result
  with xs.getMysqlCon().cursor() as mysqlcon:
    if mysqlcon is None:
      return result
    # union all for speed, since we're obsessive about keeping questions and
    #   next_added mutually exclusive
    cur.execute("select question from questions where next_scheduled is not null " +
      "union all select question from next_added")
    allQuestions = {x[0] for x in cur.fetchall()}
    while len(result) < numNeeded:
      version = getLexicon(userid)[3:] # pylint: disable=unused-variable
      mysqlcon.execute("select alphagram, studyOrderIndex from {'studyOrder'+version} " +
        "where studyOrderIndex between %s and %s order by studyOrderIndex",
        (studyOrderIndex, studyOrderIndex + 100))
      allStudyOrder = [row for row in mysqlcon.fetchall() if row[0] not in allQuestions]
      for row in allStudyOrder:
        result.append(row[0])
        studyOrderIndex = row[1]+1
        if len(result) >= numNeeded:
          break
      if len(allStudyOrder) == 0:
        studyOrderIndex = studyOrderIndex + 101
  setPrefs2("studyOrderIndex", userid, studyOrderIndex)
  return result


def getDueByDay(userid, cardbox = None):
  '''
  Returns a dict: {date: numberDue, date: numberDue, etc}
  Cardbox will return only that cardbox number, or everything if None
  Note this isn't tested yet
  '''
  result = { }
  estart = datetime(1970, 1, 1, 0, 0) # First date of the Epoch
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    statement = ("select next_scheduled/86400, count(*) from questions ? " +
      "group by next_scheduled/86400")
    if cardbox is None:
      cur.execute(statement, [""])
    else:
      cur.execute(statement, (f"where cardbox = {cardbox}",))
    for row in cur.fetchall():
      day = estart + timedelta(days=row[0])
      due = row[1]
      result[day] = due
  return result


def getTotalByLength(userid):

  ''' Returns a dict with {length: total, length: total}
        describing total words in cardbox broken out by length
  '''
  result = { }
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    command = ("select length(question), count(*) from questions " +
      "where next_scheduled is not null group by length(question)")
    cur.execute(command)
    for row in cur.fetchall():
      result[row[0]] = row[1]
  return result

def getNext (newCardbox = 0, schedVersion = 0) :

  '''
  If you are putting a word in cardbox newCardbox now,
  returns the time (in Unix Epoch format) it needs to be reviewed
  '''
  now = int(time.time())
  day = 24*3600  # number of seconds in a day

  newCardbox = min(newCardbox, 12)

  random.seed()
  offset=random.randrange(day)

# List of lists
# cardbox x is rescheduled for a time [x,y]
# between x and x+y days in the future
  if schedVersion == 1:
    sched = [ [.2, .3], [1, 1], [3, 3], [7, 7], [14, 14], [30,30], [60,45],
              [120, 90], [240, 120], [430, 100], [430,100], [430,100], [430,100] ]

  elif schedVersion == 3:
    sched = [ [0.5,1] , [1,2] , [2,6] , [6,8] , [12,10] , [19,12] , [27,18] ,
              [40,28] , [62,32] , [86,48] , [120,70] , [170,80] , [215,150] ]
  else:
    sched = [ [.5,.8], [3,2], [5,4], [11,6], [16,10], [27,14], [50,20], [80,30],
              [130,40], [300,60], [430,100], [430,100],[430,100] ]

  return int( now + (sched[newCardbox][0]*day) + (sched[newCardbox][1]*offset))

def correct (alpha, userid, nextCardbox=None, quizid=-1) :

  ''' Schedules a word in cardbox which has been marked correct
  '''
  if quizid == -1:
    now = int(time.time())
    schedVersion = getPrefs("schedVersion", userid)
    with lite.connect(getDBFile(userid)) as con :
      cur = con.cursor()
      if nextCardbox is None:
        cur.execute(f"select cardbox from questions where question='{alpha}'")
        currentCardbox = cur.fetchone()[0]
        nextCardbox = currentCardbox + 1
      cur.execute(f"update questions set cardbox = {nextCardbox}, " +
        f"next_scheduled = {getNext(nextCardbox, schedVersion)}, " +
        f"correct=correct+1, streak=streak+1, last_correct = {now}, difficulty=4 " +
        f"where question = '{alpha}'")
  else:
    with xs.getMysqlCon().cursor() as con:
      con.execute("update quiz_user_detail set correct=1, incorrect=0, " +
        "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
        "and quiz_id = %s", (alpha, userid, quizid))


def wrong (alpha, userid, quizid=-1) :

  ''' Schedules a word in cardbox which has been marked wrong
  '''
  if quizid == -1:
    schedVersion = getPrefs("schedVersion", userid)
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      if schedVersion in (1, 2, 3):
        cur.execute(f"select cardbox from questions where question='{alpha}'")
        currentCardbox = cur.fetchone()[0]
      else:
        currentCardbox = -1
      stmt = ("update questions set cardbox = ?, next_scheduled = ?, " +
        "incorrect = incorrect+1, streak=0, difficulty=4 where question = ?")
      if currentCardbox < 8:
        cur.execute(stmt, (0, getNext(0, schedVersion), alpha))
      else:
        cur.execute(stmt, (2, getNext(2, schedVersion), alpha))
  else:
    with xs.getMysqlCon().cursor() as con:
      con.execute("update quiz_user_detail set incorrect=1, correct = 0, " +
        "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
        "and quiz_id = %s", (alpha, userid, quizid))



def skipWord (alpha, userid) :
  ''' Skips a word in a cardbox quiz by rescheduling it into the near future
  '''
  # twelve hour delay
  SKIP_DELAY = 3600*12 # pylint: disable=invalid-name
  now = int(time.time())
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    command = ("update questions set next_scheduled = max(next_scheduled + ?, ?), " +
      "difficulty=4 where question = ?")
    cur.execute(command, (SKIP_DELAY, now+SKIP_DELAY, alpha))

def addWord (alpha, cur) :

  '''
  Add one word to cardbox zero - assumed to be valid
  '''
  now = int(time.time())
  cur.execute("select count(*) from questions where question = ?", (alpha,))
  qCount = cur.fetchone()[0]
  if qCount == 0:
    command = ("insert into questions (question, correct, incorrect, streak, " +
      "last_correct, difficulty, cardbox, next_scheduled) " +
      "values (?, 0, 0, 0, 0, -1, 0, ?)")
    cur.execute(command, (alpha, now))
    dbClean(cur)
  return qCount == 0

def addWords (numWords, userid, cur) :
  ''' Pull words from next_added and study_order and send each
        to addWord (which puts it in the cardbox)
  '''

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
    studyOrderAlphas = getFromStudyOrder(numWords-nextAddedCount, userid, cur)
    for alpha in studyOrderAlphas:
      addWord(alpha, cur)

def getNextAddedCount(userid):
  ''' Returns number of items in next_added
  '''
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
      cur.execute(command, (alpha, now))
  dbClean(cur)

def getAllNextAdded(userid):
  ''' Returns all data from next_added
  '''

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
  placeholder = ', '.join('?'*len(alphas))# pylint: disable=unused-variable
  sql = "delete from next_added where question in ({placeholder})"
  cur.execute(sql, (alphas,))
  return cur.rowcount

def nextAddedMoveToFront(alphas, cur):
  '''
  Takes a list of alphagrams to move to the front of the queue
  '''
  cur.execute("select min(timestamp) from next_added")
  minT = cur.fetchone()[0]
  # note: f-strings are interpreted at runtime so pylint doesn't see this usage
  placeholder = ', '.join('?'*len(alphas)) # pylint: disable=unused-variable
  sql = "update next_added set timeStamp = ? where question in ({placeholder})"
  cur.execute(sql, [minT-1].extend(alphas))
  return cur.rowcount

def nextAddedMoveToBack(alphas, cur):
  '''
  Takes a list of alphagrams to move to the back of the queue
  '''
  cur.execute("select max(timestamp) from next_added")
  maxT = cur.fetchone()[0]
  placeholder = ', '.join('?'*len(alphas))
  sql = f"update next_added set timeStamp = ? where question in ({placeholder})"
  cur.execute(sql, [maxT+1].extend(alphas))
  return cur.rowcount

def isAlphagramValid(alpha, userid):
  ''' Returns boolean -- does this alphagram have an answer?
  '''
  lexicon = getLexicon(userid)
  chCommand = "select count(*) from " + lexicon + " where alphagram = %s"
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      con.execute(chCommand, [alpha])
      return con.fetchone()[0] > 0
    return False

def ghostbuster(userid):
  ''' Removes questions that have no answer
  '''
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
  ''' Make sure the database is in a good state.
      - No overlap between questions and next_added
      - Nothing with a difficult that's not in cardbox
  '''

  cur.execute("delete from next_added where question in " +
    "(select question from questions where next_scheduled is not null)")
  cur.execute("update questions set difficulty = null where cardbox is null")


def closetSweep (cur, userid) :
  ''' Puts backlog items in backlog status
      Note this will unlock anything locked with difficulty 3
  '''

  now = int(time.time())
  closet = getPrefs("closet", userid)
  cur.execute("update questions set difficulty = 0 where " +
    f"cardbox < {closet} and difficulty != 1")
  cur.execute("update questions set difficulty = 2 " +
    f"where cardbox >= {closet} and difficulty != 1 and next_scheduled < {now}")


def makeWordsAvailable (userid, cur) :
  """
  Sets words with difficulty = -1 to be used by getQuestions
  Used by getQuestions
  """
  now = int(time.time())
  reschedHrs = getPrefs("reschedHrs", userid)
  cb0max = getPrefs("cb0max", userid)

  cur.execute("select max(cardbox) from questions")
  maxCardbox = cur.fetchone()[0]
  if maxCardbox is None:
    maxCardbox = 0
  if maxCardbox >= 10:
    maxCardbox = 30
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
    cur.execute("select count(*) from questions where difficulty != 4 " +
      "and next_Scheduled is not null")
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
    cur.execute("update questions set difficulty = -1 " +
      "where question in (select question from questions " +
                          "where difficulty = 2 "+
                          "order by cardbox, next_scheduled limit 10)")
  cur.execute("update questions set difficulty = -1 " +
    f"where difficulty = 0 and next_scheduled < {clearedUntil}")
  cur.execute(f"update new_words_at set timeStamp = {min(newWordsAt,maxReadAhead)}")
  cur.execute(f"update cleared_until set timeStamp = {min(clearedUntil, maxReadAhead+1)}")

def getBingoFromCardbox (userid, cardbox=0):
  """
  Returns a list of alphagrams that are due, length 7 or greater
  """
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select question from questions " +
      "where cardbox is not null and length(question) >= 7 and difficulty in (-1,0,2) " +
      "order by case cardbox when ? then -2 " +
      "else difficulty end, cardbox, next_scheduled limit 1", (cardbox,))
    result = cur.fetchone()
    if result is not None:
      return result[0]
    cur.execute("select question from next_added where length(question) >= 7 " +
      "order by timeStamp limit 1")
    result = cur.fetchone()
    if result is not None:
      addWord(result[0], cur)
      return result[0]
    # need to get from study order
    studyOrderIndex = getPrefs("studyOrderIndex", userid)
    cur.execute("select question from questions where cardbox is not null " +
      "and length(question) >= 7")
    allCardboxBingos = [ x[0] for x in cur.fetchall() ]
    version = getLexicon(userid)[3:]
    with xs.getMysqlCon().cursor() as mysqlcon:
      mysqlcon.execute(f"select alphagram from {'studyOrder'+version} " +
        "where length(alphagram) >= 7 " +
        "and studyOrderIndex > %s order by studyOrderIndex", (studyOrderIndex,))
      for row in mysqlcon.fetchall():
        if row[0] not in allCardboxBingos:
          addWord(row[0], cur)
          return row[0]
  return None


def getQuestions (numNeeded, userid, cardbox, questionLength=None, isCardbox=True, quizid=-1) : # pylint: disable=unused-argument
  """
  Returns a dict with a quiz of numNeeded questions in the format
    { "Alphagram" -> [ Word, Word, Word ] }
  Note questionLength is currently unused but is reserved for future functionality
  """
  # pylint: disable=too-many-arguments,too-many-locals
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
      getCardsQry = ("select question from questions " +
        f"where difficulty in ({dFormat}) and next_scheduled is not null " +
         "order by case cardbox when ? then -1 else cardbox end, next_scheduled limit ?")
      cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
      result = cur.fetchall()
      while len(result) < numNeeded:
     #  if questionLength is None:
        makeWordsAvailable(userid, cur)
        cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
        result = cur.fetchall()
     #  else:
     #    makeWordsAvailableWithFilter(numNeeded, questionLength)
      allQuestions = [x[0] for x in result]
  else:  # non cardbox quiz
    getCardsQry = ("select alphagram from quiz_user_detail " +
      "where quiz_id = %s and user_id = %s and locked = 0 and completed = 0 limit %s")
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
##    cur.execute("update questions set difficulty = -1
##      where question in (select question from questions
##                          where length(question) = {0} and difficulty in (-1,0,2)
##      order by next_scheduled limit {1})".format(questionLength, numNeeded))

def getDef (word, userid) :
  '''Returns definition of the word'''

  lexicon = getLexicon(userid)

  with xs.getMysqlCon().cursor() as con:
    command = "select definition from " + lexicon + " where word = %s"
    con.execute(command, [word])
    return con.fetchone()[0]

def getAnagrams (alpha, userid) :
  '''
  Takes in an alphagram and returns a list of words
  '''
  lexicon = getLexicon(userid)
  result = []
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      command = "select word from " + lexicon + " where alphagram = %s"
      con.execute(command, [alpha])
      for row in con.fetchall():
        result.append(row[0])
  return result

def getHooks (word, userid) :
  '''
  Takes in a word
  Returns a tuple (front hooks, word, lexicon_symbols, back hooks)
  '''
  lexicon = getLexicon(userid)
  with xs.getMysqlCon().cursor() as con:
    if con is not None:
      command = ("select front_hooks, word, lexicon_symbols, back_hooks from " +
        lexicon + " where word = %s")
      con.execute(command, [word])
      return con.fetchone()
    return (None, None, None, None)

def getAuxInfo (alpha, userid):
  '''
  Returns dict: {"cardbox": x, "nextScheduled": x, "correct": x,
      incorrect: x, difficulty: x }
  '''
  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute('select cardbox, next_scheduled, correct, incorrect, difficulty ' +
                f'from questions where question = "{alpha}" ' +
                'and next_scheduled is not null')
    result = cur.fetchall()
    if len(result) > 0:
      return {"cardbox": result[0][0], "nextScheduled": result[0][1],
        "correct": result[0][2], "incorrect": result[0][3], "difficulty": result[0][4] }
    return {}

def powerset (alpha):
  '''
  Takes an alphagram and returns a list of all possible subsets
    of length 2 or more
  '''
  return [ ''.join(a) for a in itertools.chain.from_iterable([itertools.combinations(alpha, r)
          for r in range(2,len(alpha)+1)])]

def getSubanagrams (alpha, userid):
  '''
  Takes a valid alphagram. Returns a list with all alphagrams that make
   valid words which are a valid subset of the alphagram
  '''
  filename = getLexicon(userid) + '.dawg'
  allAlphas = dawg.CompletionDAWG().load(filename)
  result = [ ]
  for subword in powerset(alpha):
    if subword in allAlphas and subword not in result:
      result.append(subword)
  return result

def getValidBlanagrams (alpha) :
  '''  Takes an alphagram. Returns a list with all alphagrams that make
       valid words with the input plus a blank
  '''
  alphaDawg = dawg.CompletionDAWG().load('alpha.dawg')
  result = []
  for char in string.ascii_uppercase:
    possibleResult = ''.join(sorted(alpha + char))
    if possibleResult in alphaDawg:
      result.append(possibleResult)

  return result

def getBlanagramQuestion (alpha, userid) :
  '''  Takes an alphagram
       Returns a list of valid questions with that alphagram plus blank
       [ alpha: xxx, words: [ word, word, word ], auxInfo: { ... } ]
  '''
  result = [ ]

  for question in getValidBlanagrams(alpha):
    result.append({ "alpha": question, "words": getAnagrams(question, userid),
                    "auxInfo": getAuxInfo(question, userid)})
  return result

def checkCardboxDatabase (userid):
  ''' Ensures that the user's cardbox contains all necessary tables, and
       creates them if necessary
  '''
  now = int(time.time())
  try:
    with lite.connect(getDBFile(userid)) as con:
      cur = con.cursor()
      cur.execute("select name from sqlite_master where type='table'")
      tables = [x[0] for x in cur.fetchall()]
      if 'questions' not in tables:
        cur.execute("create table questions (question varchar(16), correct integer, " +
                    "incorrect integer, streak integer, last_correct integer, " +
                    "difficulty integer, cardbox integer, next_scheduled integer)")
      if 'cleared_until' not in tables:
        cur.execute("create table cleared_until (timeStamp integer)")
      if 'new_words_at' not in tables:
        cur.execute("create table new_words_at (timeStamp integer)")
      if 'next_Added' not in tables:
        cur.execute("create table next_Added (question varchar(16), timeStamp integer)")
      cur.execute("create unique index if not exists question_index on questions(question)")
      cur.execute("create unique index if not exists next_added_question_idx " +
       "on next_added(question)")

      cur.execute("select * from cleared_until")
      row = cur.fetchone()
      if row is None:
        cur.execute("insert into cleared_until values (?)", (now,))

      cur.execute("select * from new_words_at")
      row = cur.fetchone()
      if row is None:
        cur.execute("insert into new_words_at values (?)", (now+1,))

  except Exception:
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
      con.execute("update quiz_user_detail set locked = %s " +
                  "where quiz_id = %s and user_id = %s and alphagram = %s",
                  (int(lock), quizid, userid, alpha))

def isInCardbox(alpha, userid) :
  '''Takes in an alphagram and userid
  Returns boolean indicating if alphagram is in the user's cardbox '''

  with lite.connect(getDBFile(userid)) as con:
    cur = con.cursor()
    cur.execute("select count(*) from questions " +
                "where question = ? and next_scheduled is not null", (alpha,))
    result = cur.fetchone()[0]
  return result==1
