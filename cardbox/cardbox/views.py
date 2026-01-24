'''Xerafin cardbox module'''

import json
from logging.config import dictConfig
from functools import lru_cache
import urllib
import time
import random
import os
import shutil
import sys
import sqlite3 as lite
import requests
import jwt
from flask import jsonify, request, send_file, g
import xerafinUtil.xerafinUtil as xu
from studyOrder import studyOrder
from cardbox import app

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})

@lru_cache(maxsize=1)
def get_public_key():
    public_key_url = 'http://keycloak:8080/realms/Xerafin'
    with urllib.request.urlopen(public_key_url) as r:
        public_key = json.loads(r.read())['public_key']
        return f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''

@app.before_request
def get_user():
  # Skip verification for public routes
  if request.endpoint in ['health']:
    return

  try:
    public_key = get_public_key()
    raw_token = request.headers.get("Authorization")
    if not raw_token:
      return jsonify({'error': 'Authorization header missing'}), 401
    if raw_token.startswith('Bearer '):
      raw_token = raw_token[7:]

    auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
    g.uuid = auth_token["sub"]
    g.name = auth_token.get("name", "Unknown")
  except jwt.ExpiredSignatureError:
    return jsonify({'error': 'Token has expired'}), 401
  except jwt.InvalidTokenError as e:
    return jsonify({'error': f'Invalid token: {str(e)}'}), 401
  except KeyError as e:
    return jsonify({'error': f'Missing required token field: {str(e)}'}), 401
  except urllib.error.URLError as e:
    return jsonify({'error': f'Cannot reach authentication service: {str(e)}'}), 503
  except Exception as e:
    return jsonify({'error': f'Authentication failed: {str(e)}'}), 401

  cardboxPrefs = auth_token.get('cardboxPrefs', { })
  g.closet = cardboxPrefs.get('closet', 10)
  g.reschedHrs = cardboxPrefs.get('reschedHrs', 24)
  g.cb0max = cardboxPrefs.get('cb0max', 500)
  g.newWordsAtOnce = cardboxPrefs.get('newWordsAtOnce', 10)
  g.schedVersion = cardboxPrefs.get('schedVersion', 0)

  # headers to send to other services
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  g.con = lite.connect(getDBFile())
  g.cur = g.con.cursor()

  return None

@app.after_request
def close_sqlite(response):
  '''Close the cursor to the cardbox database'''
  # In a crash, g.con might not have been set up correctly
  if hasattr(g, 'con') and g.con:
    g.con.commit()
    g.con.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  '''A default service to test the container is up'''
  return "Xerafin Cardbox Service"

@app.route("/getCardboxScore", methods=['GET', 'POST'])
def getCardboxScoreView():
  ''' Returns the current cardbox score '''
  result = {"score": getCardboxScore()}
  return jsonify(result)

@app.route("/getAuxInfo", methods=['POST'])
def getAuxInfoView():
  ''' Endpoint for non-cardbox quiz questions to retrieve
      info about the question from cardbox
  '''
  result = { }
  params = request.get_json(force=True) # returns dict
  result = getAuxInfo(params.get("alpha"))
  return jsonify(result)

@app.route('/getAuxInfoBatch', methods=['POST'])
def getAuxInfoBatch():
  ''' Endpoint to get auxInfo for a list of alphas
  '''
  result = { }
  params = request.get_json(force=True, silent=True)
  alphalist = params.get("alphalist", [ ])
  for alpha in alphalist:
    result[alpha] = getAuxInfo(alpha)
  return jsonify(result)

@app.route('/correct', methods=['POST'])
def correct():
  ''' Takes in an alphagram and schedules in the given cardbox.
      If no cardbox is given it will schedule in current cardbox + 1
      Returns aux info and new cardbox score '''
  result = {"status": "success"}
  params = request.get_json(force=True) # returns dict
  alpha = params.get("alpha")
  cardbox = params.get("cardbox")
  if alpha is None:
    result["status"] = "Missing alphagram"
  else:
    now = int(time.time())
    if cardbox is None:
      g.cur.execute(f"select cardbox from questions where question='{alpha}'")
      currentCardbox = g.cur.fetchone()[0]
      cardbox = currentCardbox + 1
    g.cur.execute(f"update questions set cardbox = {cardbox}, " +
      f"next_scheduled = {getNext(cardbox)}, " +
      f"correct=correct+1, streak=streak+1, last_correct = {now}, difficulty=4 " +
      f"where question = '{alpha}'")
  result["auxInfo"] = getAuxInfo(alpha)
  result["score"] = getCardboxScore()
  return jsonify(result)

@app.route('/wrong', methods=['POST'])
def wrongView():
  params = request.get_json(force=True) # returns dict
  alpha = params.get("alpha")
  return jsonify(wrong(alpha))

def wrong(alpha):
  ''' Takes in an alphagram marked wrong and moves it based on scheduling.
      Returns aux info and new cardbox score '''
  result = { }
  if g.schedVersion in (1, 2, 3):
    g.cur.execute(f"select cardbox from questions where question='{alpha}'")
    currentCardbox = g.cur.fetchone()[0]
  else:
    currentCardbox = -1
  stmt = ("update questions set cardbox = ?, next_scheduled = ?, " +
        "incorrect = incorrect+1, streak=0, difficulty=4 where question = ?")
  if currentCardbox < 8:
    g.cur.execute(stmt, (0, getNext(0), alpha))
  else:
    g.cur.execute(stmt, (2, getNext(2), alpha))

  result["auxInfo"] = getAuxInfo(alpha)
  result["score"] = getCardboxScore()
  return result


@app.route("/getQuestions", methods=['GET', 'POST'])
def getQuestions():

  result = {"_get_from_study_order": False, "questions": [ ] }

  params = request.get_json(force=True) # returns dict
  numQuestions = params.get("numQuestions", 1)
  cardbox = int(params.get("cardbox", 0))
  lock = params.get("lock", False)

  # xerafinLib.getQuestions returns something like { "ALPHAGRAM": [WORD, WORD, WORD] }
  # FYI - the None here is to filter on question length, which is currently disabled
  questions = getQuestionsFromCardbox(numQuestions, cardbox, None)

  # This is only used for non-cardbox quizzes
  result["eof"] = False

  lexService = 'http://lexicon:5000'
  for alpha in questions.keys():

    template = { }
    template["alpha"] = alpha
    template["answers"] = questions[alpha]
    auxInfo = getAuxInfo(alpha)["aux"]
    template["correct"] = auxInfo.get("correct")
    template["incorrect"] = auxInfo.get("incorrect")
    template["nextScheduled"] = auxInfo.get("nextScheduled")
    template["cardbox"] = auxInfo.get("cardbox")
    template["difficulty"] = auxInfo.get("difficulty")
    template["words"] = { }
    if lock:
      checkOut(alpha, True)
    for word in template["answers"]:
      wordJSON = { "word": word }
      wordInfo = requests.post(f'{lexService}/getWordInfo', headers=g.headers, json=wordJSON).json()
      innerHooks = requests.post(f'{lexService}/getDots', headers=g.headers, json=wordJSON).json()
#     [ front hooks, back hooks, definition, [innerHooks], lexicon symbols ]
      template["words"][word] = [ wordInfo["front_hooks"], wordInfo["back_hooks"],
                      wordInfo["definition"], innerHooks, wordInfo.get("lexicon_symbols")]
    result["questions"].append(template)

  return jsonify(result)

@app.route("/newQuiz", methods=["GET", "POST"])
def newQuiz():
  '''Resets the difficulty parameter in cardbox to prepare for a new quiz:
     - puts backlog words in the backlog
     - marks future words as either doable or undoable
     NOTE this is only accessible from other services. Not exposed through nginx rev proxy
  '''
  result = {"result": "success"}
  now = int(time.time())
  dbClean()
  closetSweep()
  futureSweep()
  g.cur.execute("select * from cleared_until")
  clearedUntil = g.cur.fetchone()[0]
  command = f"update questions set difficulty = -1 where difficulty = 0 and next_scheduled < {max(now, clearedUntil)}"
  g.cur.execute(command)
  return jsonify(result)


@app.route("/getCardboxStats", methods=["GET", "POST"])
def getCardboxStats():
  result = { }
  error = {"status": "success"}

  params = request.get_json(force=True) # returns dict

  due = params.get("due", False)
  coverage = params.get("coverage", False)
  overview = params.get("overview", False)
  earliest = params.get("earliest", False)

  now = int(time.time())
  DAY = 3600 * 24 # length of a day in seconds

  if earliest:
    earliestDueDate = getEarliestDueDate()
    result["earliestDueDate"] = earliestDueDate

  if overview:
    dueNow = getCurrentDue(True) # summarize=True to get total w/ no cardbox breakout
    totalCards = getTotal()
    result["totalCards"] = totalCards
    result["totalDue"] = dueNow["total"]

  if due:
    dueNow = getCurrentDue()
    overdue = getDueInRange(0, now)
    dueToday = getDueInRange(now, now+DAY)
    dueThisWeek = getDueInRange(now, now+(DAY*7))
    dueByCardbox = {"dueNow": dueNow, "overdue": overdue, "dueToday": dueToday,
                    "dueThisWeek": dueThisWeek}
    totalCards = getTotalByCardbox()
    result["totalCards"] = totalCards
    result["score"] = getCardboxScore()
    result["queueLength"] = getNextAddedCount()
    result["totalDue"] = sum(dueNow.values())
    result["dueByCardbox"] = dueByCardbox

  if coverage:
  ## get these values from the lexicon service (issue #51)
    allLenFreq = {2: 93, 3: 883, 4: 3503, 5: 8710, 6: 17142, 7: 27660, 8: 36693,
                  9: 39572, 10: 35637, 11: 28398, 12: 20775, 13: 14304, 14: 9373,
                  15: 5919}
     # probably from prefs service -- issue #52
#    lexicon = getLexicon(userid)
    result["coverage"] = { }
    totalCards = getTotalByLength()
    for box in totalCards:
      result["coverage"][box] = {"cardbox": totalCards[box], "total": allLenFreq[box]}
      pct = (float(totalCards[box])/float(allLenFreq[box])) * 100.0
      result["coverage"][box]["percent"] = format(pct, '.2f')

  return jsonify([result, error])

@app.route('/uploadNewWordList', methods=['POST'])
def uploadNewWordList():
  ''' Takes in a text file containing alphagrams. Adds the alphagrams to the
       user's next_added table. '''

  file = request.files.get('uploadFile')
  alphaSet = set()
  if file is not None:
    file.seek(0)
    for bLine in file:
      line = bLine.decode('utf-8')
      for word in line.split():
        alpha = ''.join(sorted(word.upper()))
        alphaSet.add(alpha)

  url = 'http://lexicon:5000/returnValidAlphas'
  resp = requests.post(url, headers=g.headers, json={'alphas': list(alphaSet)})
  validAlphas = resp.json()

  insertIntoNextAdded(validAlphas)

  result = {"added": validAlphas}
  return jsonify(result)

@app.route('/uploadCardbox', methods=['POST'])
def uploadCardbox():
  ''' Replaces a user's cardbox with the uploaded sqlite database '''

  file = request.files.get('cardbox')
  filename = getTempFile()
  file.save(filename)
  if checkCardboxDatabase():
    shutil.move(filename, getDBFile())
    result = {"status": "success"}
    reset_start_score()
  else:
    result = {"status": "Invalid Cardbox"}

  return jsonify(result)

@app.route('/initCardbox', methods=['GET', 'POST'])
def initCardbox():
  ''' runs checkCardboxDatabase on user login to ensure we have one '''
  result = {"status": checkCardboxDatabase()}
  return jsonify(result)

@app.route('/downloadCardbox', methods=['GET', 'POST'])
def downloadCardbox():
  ''' Presents the user's cardbox for download '''
  filename = getDBFile()
  return send_file(filename, as_attachment=True, download_name="cardbox.db")

@app.route('/shameList', methods=['POST'])
def shameList():
  ''' The List of Shame: Takes in a list of alphagrams.
        Any alphagrams in cardbox are marked wrong.
        Any alphagrams not in cardbox are queued to be added. '''
  params = request.get_json(force=True) # returns dict
  questions = params.get('questions', [ ])
  url = 'http://lexicon:5000/returnValidAlphas'
  resp = requests.post(url, headers=g.headers, json={'alphas': questions})
  validAlphas = resp.json()

  alphasToAdd = [ ]
  for alpha in validAlphas:

    if isInCardbox(alpha):
      wrong(alpha)
    else:
      alphasToAdd.append(alpha)

  insertIntoNextAdded(alphasToAdd)
# let's deal with this later
#  return jsonify(getCardboxStats())
  return jsonify({"status": "success"})

@app.route('/addQuestionToCardbox', methods=['POST'])
def addQuestionToCardbox():
  ''' Add one alphagram to cardbox zero, if it's valid '''
  params = request.get_json(force=True) #returns dict
  question = params.get('question', [ ])
  result = { }

  if len(getAnagrams(question)) > 0: # getAnagrams returns a list of words
    _add_word(question)
  # this is done to schedule it in the future so it's not immediately due
    wrong(question)
    result["question"] = question
    result["status"] = "success"
  else:
    result["status"] = "invalid alphagram"

  return jsonify(result)

@app.route('/getNextBingo', methods=['GET', 'POST'])
def getNextBingo():
  '''return the next word 7 letters or longer that's due'''
  params = request.get_json(force=True) # returns dict
  try:
    cardbox = int(params.get('cardbox', 0))
  except (ValueError, TypeError):
    cardbox = 0

  result = { }
  result["alpha"] = _get_bingo_from_cardbox(cardbox)
  checkOut(result["alpha"], True)

  return jsonify({"result": result, "error": {"status": "success"}})

# Library functions

def getEarliestDueDate():
  ''' Returns the earliest date a cardbox question is due.
      If this date is in the future, return cleared_until instead
  '''
  now = int(time.time())
  command = ("select min(next_scheduled) from questions " +
      "where next_scheduled is not null and next_Scheduled > 0 and difficulty != 4")
  g.cur.execute(command)
  mns = g.cur.fetchone()[0]
  try:
    if mns > now:
      command = "select * from cleared_until"
      g.cur.execute(command)
      result = g.cur.fetchone()[0]
    else:
      result = mns
  except TypeError: # questions is empty, mns is None
    result = now
  return result


def getCardboxScore():

  g.cur.execute("select sum(cardbox) from questions where next_scheduled is not null")
  score = g.cur.fetchone()[0]
  if score is None:
    result = 0
  else:
    result = score
  return result

def getCurrentDue (summarize=False):
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  '''
  now = int(time.time())
  result = { }
# What's due excludes difficulty 4 so let's make that accurate
  futureSweep()
  g.cur.execute("select * from cleared_until")
  clearedUntil = max(g.cur.fetchone()[0], now)
  if summarize:
    g.cur.execute(f"""SELECT COUNT(*) FROM questions
                      WHERE next_scheduled < {clearedUntil}
                      AND cardbox is not null AND difficulty != 4""")
    result["total"] = g.cur.fetchone()[0]
  else:
    g.cur.execute(f"""select cardbox, count(*) from questions
                      where next_scheduled < {clearedUntil} and cardbox is not null
                      and difficulty != 4 group by cardbox""")
    for row in g.cur.fetchall():
      result[row[0]] = row[1]
  return result

def getDueInRange(start, end):
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  start and end are integers - unix epoch time
  '''
  result = { }
  statement = f"""select cardbox, count(*) from questions
                 where next_scheduled between {start} and {end} and cardbox is not null
                 group by cardbox"""
  g.cur.execute(statement)
  for row in g.cur.fetchall():
    result[row[0]] = row[1]
  return result

def getTotal():
  '''
  Returns an integer, number of cards in all cardboxes
  '''
  command = "select count(*) from questions where next_scheduled is not null"
  g.cur.execute(command)
  result = g.cur.fetchone()[0]
  return result

def getTotalByCardbox():
  '''
  Returns a dict: {cardbox: numberDue, cardbox: numberDue, etc }
  '''
  result = { }
  command = """select cardbox, count(*) from questions
               where next_scheduled is not null group by cardbox"""
  g.cur.execute(command)
  for row in g.cur.fetchall():
    result[row[0]] = row[1]
  return result

def getNextAddedCount():
  ''' Returns number of items in next_added
  '''
  g.cur.execute("select count(*) from next_added")
  return g.cur.fetchone()[0]

def getTotalByLength():

  ''' Returns a dict with {length: total, length: total}
        describing total words in cardbox broken out by length
  '''
  result = { }
  command = """select length(question), count(*) from questions
               where next_scheduled is not null group by length(question)"""
  g.cur.execute(command)
  for row in g.cur.fetchall():
    result[row[0]] = row[1]
  return result


def futureSweep():
  """
  Sets things to difficulty 4 which are in the future but are in a cardbox too low to be quizzed now
  Only moves difficulty 0 and -1 -> 4
  Note difficulty 2 and 4 are exclusive
  """
  now = int(time.time())
  g.cur.execute("update questions set difficulty = 0 where difficulty in (4, 50)")
  # Anything in cardbox 10 or higher we can see 30 days ahead of schedule
  g.cur.execute("update questions set difficulty = 4 where cardbox >= 10 " +
    "and next_scheduled > ?+(3600*24*30) and difficulty in (0, -1)", (now,))
  # Anything in cardbox N; 1 <= N <= 9; we can see N days ahead of schedule
  g.cur.execute("update questions set difficulty = 4 where cardbox < 10 " +
    "and next_scheduled > ?+(cardbox*3600*24) and difficulty in (0, -1)", (now,))

def dbClean():
  ''' Make sure the database is in a good state.
      - No overlap between questions and next_added
      - Nothing with a difficult that's not in cardbox
  '''

  g.cur.execute('''delete from next_added where question in
                (select question from questions where next_scheduled is not null)''')
  g.cur.execute("update questions set difficulty = null where cardbox is null")


def closetSweep():
  ''' Puts backlog items in backlog status
      Note this will unlock anything locked with difficulty 3
  '''

  now = int(time.time())
  g.cur.execute("update questions set difficulty = 0 where " +
    f"cardbox < {g.closet} and difficulty != 1")
  g.cur.execute("update questions set difficulty = 2 " +
    f"where cardbox >= {g.closet} and difficulty != 1 and next_scheduled < {now}")


#def getLexicon(userid):
#  ''' Returns lexicon and version for this user
#  '''
#  lexicon = "csw"
#  with xs.getMysqlCon().cursor() as con:
#    command = "select version from user_lexicon_master where userid = %s and lower(lexicon) = %s"
#    con.execute(command, (userid, lexicon))
#    version = con.fetchone()[0]
#  return f"{lexicon}{version}"

def getQuestionsFromCardbox (numNeeded, cardbox, questionLength=None) : # pylint: disable=unused-argument
  """
  Returns a dict with a quiz of numNeeded questions in the format
    { "Alphagram" -> [ Word, Word, Word ] }
  Note questionLength is currently unused but is reserved for future functionality
  """
  # pylint: disable=too-many-arguments,too-many-locals
  quiz = {}

  # Cardbox doesn't filter, it only prioritizes one cardbox over others
  # If you specifically ask for a cardbox in the backlog, ignore backlogging
  if cardbox >= g.closet:
    diffToGet = (-1,2)
    dFormat = "?,?"
  else:
    diffToGet = (-1,)
    dFormat = "?"

  getCardsQry = ("select question from questions " +
    f"where difficulty in ({dFormat}) and next_scheduled is not null " +
     "order by case cardbox when ? then -1 else cardbox end, next_scheduled limit ?")
  g.cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
  result = g.cur.fetchall()
  if len(result) < numNeeded:
    makeWordsAvailable(numNeeded-len(result))
    g.cur.execute(getCardsQry, diffToGet+(cardbox,numNeeded))
    result = g.cur.fetchall()
  allQuestions = [x[0] for x in result]
  for alpha in allQuestions:
    quiz[alpha] = getAnagrams(alpha)
  return quiz

def makeWordsAvailable(words_needed) :
  """
  Sets words with difficulty = -1 to be used by getQuestions
  Used by getQuestionsFromCardbox
  """
  now = int(time.time())
  futureSweep()

  g.cur.execute("select max(cardbox) from questions")
  max_cardbox = g.cur.fetchone()[0] or 0
  if max_cardbox >= 10:
    max_cardbox = 30

  # only give new words when we clear reschedHrs in the future
  new_words_nlt = now + (3600*g.reschedHrs)
  max_work_ahead = max(now + (max_cardbox*3600*24), new_words_nlt+60)
  g.cur.execute("select * from cleared_until")
  cleared_until = max(g.cur.fetchone()[0], now)
  g.cur.execute("select * from new_words_at")
  # if we previously gave new words for a certain (absolute) time period
  # do not give new words for that time period again
  new_words_at = max(g.cur.fetchone()[0], new_words_nlt)
  seconds_per_backlog = 360 # 10 backlog words per hour working ahead
  seconds_per_new_word = 3600 / g.newWordsAtOnce # similarly

  g.cur.execute("select count(*) from questions where difficulty = 2")
  backlog_size = g.cur.fetchone()[0] or 0
  g.cur.execute("select count(*) from questions where cardbox = 0")
  cb0_available = g.cb0max - (g.cur.fetchone()[0] or 0)

  g.cur.execute('''SELECT question, cardbox, next_scheduled, difficulty
                   FROM questions WHERE next_scheduled > ?
                   ORDER BY next_scheduled ASC limit 1''',(cleared_until,))
  row = g.cur.fetchone()

  for i in range(0,words_needed):
    g.cur.execute(""" SELECT question FROM questions
                      WHERE difficulty = 0 AND next_scheduled < ?
                      ORDER BY next_scheduled ASC LIMIT 1""", (cleared_until,))
    row = g.cur.fetchone()
    if row:
      g.cur.execute("UPDATE questions SET difficulty = -1 WHERE question = ?", (row[0],))
      continue
    if backlog_size > i:
      if cleared_until <= new_words_at or cb0_available < 1:
        g.cur.execute("""UPDATE questions SET difficulty = -1
                     WHERE difficulty = 2
                     ORDER BY cardbox, next_scheduled LIMIT 1
                      """)
        cleared_until = cleared_until + seconds_per_backlog
      else: # there is backlog, but it's time for a new word
        addWords(1)
        cb0_available = cb0_available - 1
        new_words_at = new_words_at + seconds_per_new_word
    else: # no backlog
      g.cur.execute('SELECT min(next_scheduled) FROM questions WHERE difficulty = 0')
      min_eligible = g.cur.fetchone()[0] or 0
      if min_eligible == 0: # the emergency situation
        addWords(1)
      elif min_eligible < new_words_at or cb0_available < 1:
        g.cur.execute("""SELECT question FROM questions
                         WHERE difficulty = 0 AND next_scheduled = ?
                         LIMIT 1""",(min_eligible,))
        row = g.cur.fetchone()
        g.cur.execute("UPDATE questions SET difficulty = -1 WHERE question = ?", (row[0],))
        cleared_until = min_eligible
      else:
        addWords(1)
        cb0_available = cb0_available - 1
        new_words_at = new_words_at + seconds_per_new_word
  g.cur.execute(f'UPDATE cleared_until SET timeStamp = {cleared_until}')
  g.cur.execute(f'UPDATE new_words_at SET timeStamp = {new_words_at}')

def _add_word (alpha) :

  '''
  Add one word to cardbox zero - assumed to be valid
  '''
  now = int(time.time())
  g.cur.execute("select count(*) from questions where question = ?", (alpha,))
  qCount = g.cur.fetchone()[0]
  if qCount == 0:
    command = ("insert into questions (question, correct, incorrect, streak, " +
      "last_correct, difficulty, cardbox, next_scheduled) " +
      "values (?, 0, 0, 0, 0, -1, 0, ?)")
    g.cur.execute(command, (alpha, now))
  return qCount == 0

def addWords (numWords) :
  ''' Pull words from next_added and study_order and send each
        to _add_word (which puts it in the cardbox)
  '''

  if numWords == 0:
    return
# We assume everything in next_added and study_order is valid

  dbClean()
  nextAddedCount = getNextAddedCount()
  g.cur.execute("select question from next_added order by timeStamp limit ?", (numWords,))
  result = g.cur.fetchall()
  if result is not None:
    wordsToAdd = [x[0] for x in result]
    for word in wordsToAdd:
      _add_word(word)
  if numWords > nextAddedCount:
    studyOrderAlphas = _get_from_study_order(numWords-nextAddedCount)
    for alpha in studyOrderAlphas:
      _add_word(alpha)
  dbClean()
  return

def _get_from_study_order (numNeeded, getBingo=False):
  ''' Returns the next numNeeded alphagrams from study order. Excludes questions
        already in cardbox or in next_added
  '''
  result = [ ]
  if numNeeded < 1:
    return result
  # union all for speed, since we're turning this into a set
  g.cur.execute("select question from questions where next_scheduled is not null " +
              "union all select question from next_added")
  allQuestions = {x[0] for x in g.cur.fetchall()}
  if getBingo:
    unusedStudyOrder = [x for x in studyOrder.data if x not in allQuestions and len(x) >= 7]
  else:
    unusedStudyOrder = [x for x in studyOrder.data if x not in allQuestions]
  result = unusedStudyOrder[:numNeeded]
  return result

def getAnagrams(alpha):
  ''' Query the lexicon service to get valid words for an alphagram
      Should return a list of words ['baa', 'aba']'''

  url = 'http://lexicon:5000/getAnagrams'
  return requests.post(url, headers=g.headers, json={'alpha': alpha}).json()

def getAuxInfo (alpha):
  '''
  Returns dict: {"alpha": alpha,
                 "aux": {"cardbox": x, "nextScheduled": x, "correct": x,
                            incorrect: x, difficulty: x }
                }
  '''
  auxInfo = {"alpha": alpha}
  g.cur.execute('select cardbox, next_scheduled, correct, incorrect, difficulty ' +
              f'from questions where question = "{alpha}" ' +
              'and next_scheduled is not null')
  result = g.cur.fetchone()
  if result:
    auxInfo["aux"] = {"cardbox": result[0], "nextScheduled": result[1],
      "correct": result[2], "incorrect": result[3], "difficulty": result[4] }
  else:
    auxInfo["aux"] = { }
  return auxInfo

def checkOut (alpha, lock) :
  """
  if LOCK is true, set difficulty = 3 (locked)
  if LOCK is false, set difficulty = 0
  locks are cleared by closetSweep() and newQuiz()
  """
  if lock:
    difficulty = 3
  else:
    difficulty = 0

  g.cur.execute(f"update questions set difficulty = {difficulty} where question = '{alpha}'")

def _get_bingo_from_cardbox(cardbox=0):
    """
    Returns a list of alphagrams that are due, length 7 or greater
    Uses the authenticated user's database connection via g.cur
    """
    try:
        # Use the existing cursor from g (already connected to user's DB)
        cur = g.cur

        # First query: get due questions from cardbox
        cur.execute("""
            SELECT question FROM questions
            WHERE cardbox IS NOT NULL
            AND length(question) >= 7
            AND difficulty IN (-1, 0, 2)
            ORDER BY CASE cardbox WHEN ? THEN -2
                     ELSE difficulty END,
                     cardbox, next_scheduled
            LIMIT 1
        """, (cardbox,))

        result = cur.fetchone()
        if result is not None:
            return result[0]

        # Second query: get from next_added
        cur.execute("""
            SELECT question FROM next_added
            WHERE length(question) >= 7
            ORDER BY timeStamp
            LIMIT 1
        """)

        result = cur.fetchone()
        if result is not None:
            _add_word(result[0])
            return result[0]

        # Third fallback: get from study order
        result = _get_from_study_order(1, True)
        _add_word(result[0])
        return result[0]

    except Exception as e:
        # Log error and re-raise or handle appropriately
        print(f"Error in _get_bingo_from_cardbox: {e}")
        raise

def getNext (newCardbox = 0) :

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
  if g.schedVersion == 1:
    sched = [ [.2, .3], [1, 1], [3, 3], [7, 7], [14, 14], [30,30], [60,45],
              [120, 90], [240, 120], [430, 100], [430,100], [430,100], [430,100] ]

  elif g.schedVersion == 3:
    sched = [ [0.5,1] , [1,2] , [2,6] , [6,8] , [12,10] , [19,12] , [27,18] ,
              [40,28] , [62,32] , [86,48] , [120,70] , [170,80] , [215,150] ]
  else:
    sched = [ [.5,.8], [3,2], [5,4], [11,6], [16,10], [27,14], [50,20], [80,30],
              [130,40], [300,60], [430,100], [430,100],[430,100] ]

  return int( now + (sched[newCardbox][0]*day) + (sched[newCardbox][1]*offset))

def isInCardbox(alpha):
  g.cur.execute(f'SELECT count(*) FROM questions WHERE question = "{alpha}"')
  return g.cur.fetchone()[0] > 0

def insertIntoNextAdded(alphagrams):
  '''
  Takes in a list of alphagrams to add to next_added
  Does not check to make sure it's valid -- check before you send here
  '''

  now = int(time.time())
  command = "insert into next_added (question, timeStamp) values (?, ?)"
  added = [ ]
  for alpha in alphagrams:
    try:
      g.cur.execute(command, (alpha, now))
      added.append(alpha)
    except lite.IntegrityError:
      pass # duplicate tried to be inserted
  dbClean()

def getDBFile():
  ''' Return the path to a user's cardbox '''
  filename = os.path.join(sys.path[0], 'cardbox-data', f'{g.uuid}.db')
  return filename

def getTempFile():
  ''' Return the path to a user's temporary cardbox, used during upload '''
  filename = os.path.join(sys.path[0], "temp-data", f'{g.uuid}.db')
  return filename

def checkCardboxDatabase ():
  ''' Does this database have a questions table? If not return false. If so, return true.
        If other aux tables are missing, create them. This could be a Zyzzyva cardbox uploaded '''
  now = int(time.time())
  try:
      g.cur.execute("select name from sqlite_master where type='table'")
      tables = [x[0] for x in g.cur.fetchall()]
      if 'questions' not in tables:
        g.cur.execute(''' create table questions (question varchar(16), correct integer, incorrect integer,
                        streak integer, last_correct integer, difficulty integer,
                        cardbox integer, next_scheduled integer)''')
#        return False
      ### For reference:
      ###  create table questions (question varchar(16), correct integer, incorrect integer,
      ###                          streak integer, last_correct integer, difficulty integer,
      ###                          cardbox integer, next_scheduled integer)")
      if 'cleared_until' not in tables:
        g.cur.execute("create table cleared_until (timeStamp integer)")
      if 'new_words_at' not in tables:
        g.cur.execute("create table new_words_at (timeStamp integer)")
      if 'next_Added' not in tables:
        g.cur.execute("create table next_Added (question varchar(16), timeStamp integer)")
      g.cur.execute("create unique index if not exists question_index on questions(question)")
      g.cur.execute("create unique index if not exists next_added_question_idx on next_added(question)")

      g.cur.execute("select * from cleared_until")
      row = g.cur.fetchone()
      if row is None:
        g.cur.execute("insert into cleared_until values (?)", (now,))

      g.cur.execute("select * from new_words_at")
      row = g.cur.fetchone()
      if row is None:
        g.cur.execute("insert into new_words_at values (?)", (now+1,))

  except:
    return False

  return True

def reset_start_score():
  ''' Send a request to stats/resetStartScore to reset cardbox movment after upload
  '''
  data = {"score": getCardboxScore()}
  url = 'http://stats:5000/resetStartScore'
  resp = requests.post(url, headers=g.headers, json={"score": getCardboxScore()}).json()
  if not resp["success"]:
    app.logger.info(f"Unable to reset cardbox score on upload for {g.uuid}. See stats log for more info.")
  return
