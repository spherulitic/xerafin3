import os, time
from logging.config import dictConfig
import urllib
import json
from functools import lru_cache
from datetime import datetime
from flask import jsonify, request, g
import requests
import jwt
import xerafinUtil.xerafinUtil as xu
from quiz import app
from quiz.cardbox_logic import choose_cardbox_action

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

QUIZJSON_PATH = "/app/quizjson"

QUIZ_TYPE_DAILY = 1
QUIZ_TYPE_NEW = 2
QUIZ_TYPE_WEEKLY = 4
QUIZ_TYPE_VOWEL = 5
QUIZ_TYPE_MONTHLY = 6
QUIZ_TYPE_PROB = 7
QUIZ_TYPE_BLANK = 8

BLANK_MIN_ANSWERS = 1
BLANK_MAX_ANSWERS = 10

class QuizGenerationError(RuntimeError):
  '''A periodic quiz could not be generated; nothing was stored.'''

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

    g.mysqlcon = xu.getMysqlCon()
    g.con = g.mysqlcon.cursor()
    # headers to send when calling other services
    g.headers = {"Accept": "application/json", "Authorization": raw_token}
    g.start_time = time.time()

    return None

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

@app.teardown_request
def close_mysql(exception=None):
  '''Safely close MySQL connection if it exists '''
  mysqlcon = g.pop('mysqlcon', None)
  if mysqlcon is not None:
    try:
      if exception is None:
        mysqlcon.commit()
      mysqlcon.close()
    except Exception as e:
      app.logger.error(f"Error closing MySQL connection: {str(e)}")

  if hasattr(g, 'start_time'):
    duration = time.time() - g.start_time

    if duration > 1.0:
      app.logger.warning(
            f"⚠️ SLOW REQUEST: {request.method} {request.path} | "
            f"JSON: {request.get_json(silent=True)} | "
            f"duration: {duration:.3f}s | "
            f"user: {g.get('uuid', 'unknown')}"
      )

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Quiz Management Service"

@app.route("/generatePeriodicQuizzes", methods=["GET", "POST"])
def generatePeriodicQuizzesView():
  body = request.get_json(silent=True) or {}
  force = request.args.get('force') == '1' or bool(body.get('force'))
  result = generatePeriodicQuizzes(force=force)
  status = 500 if result["failed"] else 200
  return jsonify({"status": "failed" if result["failed"] else "completed",
                  **result}), status

@app.route("/getSubscriptions", methods=["GET", "POST"])
def getSubscriptions():

  result = { }
  result["init"] = { }
  result["subs"] = [ ]

  stmt = "select sub_group, descr, sub_id from sub_master order by sub_group, sub_id"
  g.con.execute(stmt)

  for row in g.con.fetchall():
    if row[0] not in result["init"]:
      result["init"][row[0]] = { }

    result["init"][row[0]][row[2]] = row[1]

  stmt = "select sub_id from sub_user_xref where user_id = %s"
  g.con.execute(stmt, [g.uuid])
  dbg = g.con.fetchall()

  result["subs"] = [x[0] for x in dbg]

  return jsonify(result)

@app.route("/getQuestions", methods=["GET", "POST"])
def getQuestions():
  '''Return a list of questions to the client'''
  params = request.get_json(force=True)
  result = {"questions": [ ] }
  isCardbox = params.get('isCardbox', True)

  if isCardbox:
    url = 'http://cardbox:5000/getQuestions'
    response = xu.check401(requests.post(url, headers=g.headers, json=params))
    return jsonify(response.json())
  else:
    # Build a non-cardbox quiz
    numQuestions = params.get("numQuestions", 1)
    quizid = int(params.get("quizid", -1))
    lock = params.get("lock", False)
    requestedAlpha = params.get("alpha", None)

    # xerafinLib.getQuestions returns something like { "ALPHAGRAM": [WORD, WORD, WORD] }
    # FYI - the None here is to filter on question length, which is currently disabled

    # Note if requestedAlpha is populated, numQuestions is ignored

    if requestedAlpha:
      pass # to be implemented later
#      questions = {requestedAlpha: xerafinLib.getAnagrams(requestedAlpha, userid)}
    else:
      questions = getNonCardboxQuestions(numQuestions, quizid)

    # eof is the only exhaustion signal the interface reads. It applies to
    # non-cardbox quizzes only: they are backed by a finite list of rows, so a
    # short response means the quiz is done. Cardbox never reports exhaustion.
    if len(questions) != numQuestions:
      result["eof"] = True
    else:
      result["eof"] = False

    for alpha in questions.keys():

      template = { }
      template["alpha"] = alpha
      template["answers"] = questions[alpha]
      # Blank questions never enter the cardbox, so aux info for one is always
      # empty. Skip the round trip rather than ask for known-empty data.
      if _is_blank(alpha):
        auxInfo = { }
      else:
        url = 'http://cardbox:5000/getAuxInfo'
        data = {"alpha": alpha}
        auxInfo = xu.check401(requests.post(url, headers=g.headers, json=data)).json()["aux"]
      template["correct"] = auxInfo.get("correct")
      template["incorrect"] = auxInfo.get("incorrect")
      template["nextScheduled"] = auxInfo.get("nextScheduled")
      template["cardbox"] = auxInfo.get("cardbox")
      template["difficulty"] = auxInfo.get("difficulty")
      # Server-decided highlight/eligibility flag: word is in the cardbox and due
      template["cardboxEligible"] = (auxInfo.get("cardbox") is not None
                                     and auxInfo.get("difficulty") != 4)
      template["words"] = { }
      if lock:
        checkOut(alpha, quizid, lock)
      lex_service = 'http://lexicon:5000'
      for word in template["answers"]:
        word_json = {"word": word}
        word_info = xu.check401(requests.post(f'{lex_service}/getWordInfo', headers=g.headers, json=word_json)).json()
        inner_hooks = xu.check401(requests.post(f'{lex_service}/getDots', headers=g.headers, json=word_json)).json()
     # [ front hooks, back hooks, definition, [inner hooks], lexicon symbols ]
        template["words"][word] = [ word_info.get("front_hooks", ""), word_info.get("back_hooks", ""),
          word_info.get("definition") or "", inner_hooks, word_info.get("lexicon_symbols") ]
      result["questions"].append(template)

    return jsonify(result)

def _cardbox_op(alpha, target, correct):
  '''Reschedule alpha exactly in `target` (correct) or demote it (wrong).
     Returns (auxInfo, score) from the cardbox service. '''
  data = {"alpha": alpha}
  if correct:
    url = 'http://cardbox:5000/correct'
    data['cardbox'] = target
  else:
    url = 'http://cardbox:5000/wrong'
  resp = xu.check401(requests.post(url, headers=g.headers, json=data)).json()
  return resp['auxInfo'], resp['score']

def _cardbox_score():
  '''Current cardbox score. '''
  url = 'http://cardbox:5000/getCardboxScore'
  return xu.check401(requests.get(url, headers=g.headers)).json()['score']

def _cardbox_aux(alpha):
  '''Aux info for a single alphagram. '''
  url = 'http://cardbox:5000/getAuxInfo'
  return xu.check401(requests.post(url, headers=g.headers, json={"alpha": alpha})).json()

def _is_blank(alpha):
  '''True for a blank question key ("AAIINR?"). Blank keys never touch the
     cardbox, so every cardbox path is skipped for them. '''
  return isinstance(alpha, str) and '?' in alpha

def _increment_stats():
  '''Bumps today's leaderboard entry via stats; one retry on 5xx or timeout.

     Returns {'qAnswered', 'startScore'}. Raises DownstreamError for a 401 so
     the client can refresh its token, and requests.RequestException (or
     ValueError for a non-JSON body) for anything else.
  '''
  url = 'http://stats:5000/increment'
  for attempt in (0, 1):
    try:
      resp = xu.check401(requests.get(url, headers=g.headers, timeout=5))
    except requests.RequestException:
      if attempt == 0:
        continue
      raise
    if resp.status_code >= 500 and attempt == 0:
      continue
    resp.raise_for_status()     # an HTML error page must not reach .json()
    data = resp.json()
    return {'qAnswered': int(data["questionsAnswered"]),
            'startScore': data["startScore"]}

def _already_answered(alpha, quizid):
  '''True if this question has already been answered in this quiz. '''
  g.con.execute("select completed from quiz_user_detail "
    "where alphagram = %s and user_id = %s and quiz_id = %s",
    (alpha, g.uuid, quizid))
  row = g.con.fetchone()
  return bool(row and row[0])


@app.route('/submitQuestion', methods=["GET", "POST"])
def submitQuestion():

  result = { }
  params = request.get_json(force=True) # returns a dict

  # quiz -1 is cardbox only
  quizid = int(params.get("quizid", -1))
  alpha = params.get("question")
  correct = params.get('correct') # boolean
  increment = params.get("incrementQ") # boolean

  # cardbox reschedule inputs
  servedCardbox = params.get('servedCardbox', None)      # cardbox when served
  cardboxEligible = params.get('cardboxEligible', None)  # in cardbox and due
  setCardbox = params.get('setCardbox', None)            # explicit direct schedule
  legacyCardbox = params.get('cardbox', None)            # legacy target / -2 sentinel

  if increment:
    # Bump the leaderboard. Best effort: a stats failure must not discard the
    # quiz/cardbox work below (issue #726).
    try:
      result.update(_increment_stats())
    except xu.DownstreamError:
      raise                     # 401 still needs the client-side token refresh
    except (requests.RequestException, ValueError, KeyError) as e:
      app.logger.warning(f'stats /increment failed: {e}')

    # MILESTONE CHATS
    # Every 50 up to 500, every 100 up to 1000, every 200 after that

    qAnswered = result.get("qAnswered")
    if qAnswered is not None:
      milestone = ((qAnswered < 501 and qAnswered%50==0) or
                  (qAnswered < 1001 and qAnswered%100==0) or
                  (qAnswered%200==0) or (qAnswered%500==0))
      if milestone:
        submitMilestoneChat(qAnswered)

  result['cardboxUpdated'] = False

  if _is_blank(alpha):
    # Blank questions never create or move cards (epic #195). Record quiz
    # progress only and report the cardbox state without touching it, even if
    # the client sent a cardbox target.
    if quizid > -1:
      if correct:
        mark_correct(alpha, quizid)
      else:
        mark_wrong(alpha, quizid)
    result['score'] = _cardbox_score()
    result['aux'] = {"alpha": alpha, "aux": { }}
  elif setCardbox is not None:
    # explicit direct schedule (alpha stats dropdown, moveToCardbox)
    target = int(setCardbox)
    result['aux'], result['score'] = _cardbox_op(alpha, target, target > 0)
    result['cardboxUpdated'] = True
  elif legacyCardbox == -2:
    # legacy sloth: increment only, no reschedule
    pass
  elif cardboxEligible is not None:
    # server decides the cardbox action (issue #92): one submit does both the
    # quiz update and any cardbox reschedule
    previously_answered = _already_answered(alpha, quizid) if quizid > -1 else False
    action = choose_cardbox_action(correct, cardboxEligible,
                                   previously_answered, servedCardbox is not None)
    if action == "advance":
      result['aux'], result['score'] = _cardbox_op(alpha, servedCardbox + 1, True)
      result['cardboxUpdated'] = True
    elif action == "restore":
      result['aux'], result['score'] = _cardbox_op(alpha, servedCardbox, True)
      result['cardboxUpdated'] = True
    elif action == "demote":
      result['aux'], result['score'] = _cardbox_op(alpha, 0, False)
      result['cardboxUpdated'] = True
    else:
      result['score'] = _cardbox_score()
      result['aux'] = _cardbox_aux(alpha)
    if quizid > -1:
      if correct:
        mark_correct(alpha, quizid)
      else:
        mark_wrong(alpha, quizid)
  elif legacyCardbox is not None and quizid == -1:
    # legacy cardbox quiz / sloth advance: front sends current cardbox, server +1
    result['aux'], result['score'] = _cardbox_op(alpha, legacyCardbox + 1, correct)
    result['cardboxUpdated'] = True
  else:
    # legacy non-cardbox quiz: update quiz detail, no cardbox reschedule
    if correct:
      mark_correct(alpha, quizid)
    else:
      mark_wrong(alpha, quizid)
    result['score'] = _cardbox_score()
    result['aux'] = _cardbox_aux(alpha)

  return jsonify(result)

def buildQuizIdList(params):
  '''Builds the list of quiz ids matching the given search parameters.
  Shared by getQuizList and resetQuizList so bulk resets match the
  search results exactly.'''
  QUIZ_INACTIVE_TIMER = 4 # how many days before inactive quizzes drop off the list

  # Supported search types - myQuizzes, completed, daily, weekly, monthly,
  # quizid, new, vowel, probability
  searchType = params.get('searchType')
  minLength = params.get('minLength', 2)
  maxLength = params.get('maxLength', 15)
  minDate = params.get('minDate')
  maxDate = params.get('maxDate')

  if searchType == "emptyList":
    quizidList = []

  elif searchType == "myQuizzes":
    # Subscriptions
    # Bookmarks
    # Cardbox

    quizidSet = set()
    # Subscriptions
    command = ''' SELECT DISTINCT qm.quiz_id
                  FROM sub_user_xref sux
                  JOIN quiz_master qm ON sux.sub_id = qm.sub_id
                  WHERE sux.user_id = %s
                  AND qm.sub_id IS NOT NULL
              '''
    g.con.execute(command, [g.uuid])
    quizidSet.update([row[0] for row in g.con.fetchall()])


    # User Bookmarks
    command = "select quiz_id from user_quiz_bookmark where user_id = %s"
    g.con.execute(command, [g.uuid])
    quizidSet = quizidSet | {x[0] for x in g.con.fetchall()}

    # no completed quizzes in My Quizzes. The front end wants them separate
    stmt = '''select quiz_id from quiz_user_detail
           where user_id = %s group by quiz_id having sum(completed) = count(*)'''
    g.con.execute(stmt, [g.uuid])
    completedList = [x[0] for x in g.con.fetchall()]
    for q in completedList:
      quizidSet.discard(q)

    quizidList = list(quizidSet)

    # Cardbox
    quizidList.append(-1)

  elif searchType == "completed":
    stmt = '''select quiz_id from quiz_user_detail where user_id = %s
           group by quiz_id having sum(completed) = count(*)
           and max(last_answered) > DATE_SUB(CURDATE(), INTERVAL %s DAY)
           order by max(last_answered) desc'''
    g.con.execute(stmt, [g.uuid, QUIZ_INACTIVE_TIMER])
    quizidList = [x[0] for x in g.con.fetchall()]

  elif searchType == "daily":

    command = "select quiz_id from quiz_master where quiz_type in (%s, %s) and DATE(create_date) between %s and %s and length between %s and %s"
    g.con.execute(command, [QUIZ_TYPE_DAILY, QUIZ_TYPE_BLANK, minDate, maxDate, minLength, maxLength])
    quizidList = [x[0] for x in g.con.fetchall()]

  elif searchType == "weekly":
    stmt = "select quiz_id from quiz_master where quiz_type = %s and YEARWEEK(create_date, 1) between YEARWEEK(%s, 1) and YEARWEEK(%s, 1)"
    g.con.execute(stmt, [QUIZ_TYPE_WEEKLY, minDate, maxDate])
    quizidList = [x[0] for x in g.con.fetchall()]

  elif searchType == "monthly":
    stmt = "select quiz_id from quiz_master where quiz_type = %s and EXTRACT(YEAR_MONTH from create_date) between EXTRACT(YEAR_MONTH from %s) and EXTRACT(YEAR_MONTH from %s)"
    g.con.execute(stmt, [QUIZ_TYPE_MONTHLY, minDate, maxDate])
    quizidList = [x[0] for x in g.con.fetchall()]

  elif searchType == "quizid":
    quizidList = [params.get('quizid')]

  elif searchType == "new":
    stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
    g.con.execute(stmt, [QUIZ_TYPE_NEW, minLength, maxLength])
    quizidList = [x[0] for x in g.con.fetchall()]

  elif searchType == "vowel":
    stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
    g.con.execute(stmt, (QUIZ_TYPE_VOWEL, minLength, maxLength))
    quizidList = [x[0] for x in g.con.fetchall()]
#    result["foundquiz"] = quizidList

  elif searchType == "probability":
    minProb = params.get('minProb')
    maxProb = params.get('maxProb')
    stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s"
    args = [QUIZ_TYPE_PROB, minLength, maxLength]
    if minProb is not None:
      stmt = stmt + " and max_prob > %s and min_prob < %s"
      args = args + [minProb, maxProb]
    stmt = stmt + " order by length, min_prob"
    g.con.execute(stmt, args)
    quizidList = [x[0] for x in g.con.fetchall()]

  else:
    quizidList = [ ]

  return quizidList[:50] # hard limit of 50 results

@app.route("/getQuizList", methods=["GET", "POST"])
def getQuizList():
  '''Returns a dict where the quizid is the keys'''
  params = request.get_json(force=True) # returns a dict
  result = { }

  # Supported search types - myQuizzes, daily, quizid, completed
  quizidList = buildQuizIdList(params)

  # Batch fetch all data to avoid N+1 queries
  quiz_metadata = {}
  user_progress = {}
  bookmarked_set = set()

  # Filter out cardbox (-1) from batch queries
  regular_quizids = [qid for qid in quizidList if qid != -1]

  if regular_quizids:
    # Batch fetch quiz metadata
    placeholders = ','.join(['%s'] * len(regular_quizids))
    command = f"select quiz_id, quiz_name, quiz_size from quiz_master where quiz_id in ({placeholders})"
    g.con.execute(command, regular_quizids)
    quiz_metadata = {row[0]: {'quiz_name': row[1], 'quiz_size': row[2]} for row in g.con.fetchall()}

    # Batch fetch user progress
    command = f'''select quiz_id, count(*), sum(completed), sum(sign(correct)), max(last_answered)
                  from quiz_user_detail
                  where user_id = %s and quiz_id in ({placeholders})
                  group by quiz_id'''
    g.con.execute(command, [g.uuid] + regular_quizids)
    user_progress = {row[0]: row[1:] for row in g.con.fetchall()}  # Store as tuple (count, sum_completed, sum_correct, max_last_answered)

    # Batch fetch bookmarks
    command = f"select quiz_id from user_quiz_bookmark where user_id = %s and quiz_id in ({placeholders})"
    g.con.execute(command, [g.uuid] + regular_quizids)
    bookmarked_set = {row[0] for row in g.con.fetchall()}

  for index, qid in enumerate(quizidList):

    if qid == -1:
      result[-1] = {"quizid": qid, "quizname": "Cardbox", "quizsize": -1, "untried": -1, "unsolved": -1, "status": "Active"}
    else:
      template = {}
      template["quizid"] = qid

      # Get metadata from batch
      meta = quiz_metadata.get(qid, {})
      template["quizname"] = meta.get('quiz_name', 'Unknown')
      template["quizsize"] = int(meta.get('quiz_size', 0))

      # Get user progress from batch
      progress = user_progress.get(qid)

      if not progress or int(progress[0]) == 0:
        template["status"] = "Inactive"
        template["untried"] = template["quizsize"]
        template["unsolved"] = template["quizsize"]
        template["correct"] = 0
        template["incorrect"] = 0
      else:
        count, sum_completed, sum_correct, max_last_answered = progress
        template["untried"] = template["quizsize"] - int(sum_completed)
        if template["untried"] == 0:
          template["status"] = "Completed"
        else:
          template["status"] = "Active"

        template["unsolved"] = template["quizsize"] - int(sum_correct)
        template["correct"] = int(sum_correct)
        template["incorrect"] = int(sum_completed) - int(sum_correct)

      template["bookmarked"] = qid in bookmarked_set
      template["sub"] = (params.get('searchType') == "myQuizzes" and qid != -1 and not template["bookmarked"] )

      result[index] = template

  return jsonify(result)

@app.route("/resetQuiz", methods=["POST"])
def resetQuiz():
  '''Resets progress for a single quiz for the current user.'''
  params = request.get_json(force=True) # returns a dict
  quizid = params.get('quizid', params.get('quiz'))
  action = params.get('action', 'resetall')

  if action not in ("resetall", "resetwrong"):
    return jsonify({'error': 'invalid action'}), 400

  if action == "resetall":
    g.con.execute("update quiz_user_detail set locked=0, completed=0, correct=0, "
        + "incorrect=0, last_answered=NULL where quiz_id=%s and user_id=%s", (quizid, g.uuid))
  else:
    g.con.execute("update quiz_user_detail set locked=0, completed=0, correct=0, "
        + "incorrect=0, last_answered=NULL where quiz_id=%s and user_id=%s and incorrect=1",
        (quizid, g.uuid))

  return jsonify({'reset': quizid, 'action': action})

@app.route("/resetQuizList", methods=["POST"])
def resetQuizList():
  '''Resets progress for every quiz matching the given search parameters.
  Mirrors getQuizList so the reset exactly covers the current search results.'''
  params = request.get_json(force=True) # returns a dict
  action = params.get('action', 'resetall')

  quizidList = [qid for qid in buildQuizIdList(params) if qid != -1]

  if not quizidList:
    return jsonify({'count': 0, 'quizids': []})

  placeholders = ','.join(['%s'] * len(quizidList))
  g.con.execute("update quiz_user_detail set locked=0, completed=0, correct=0, "
      + "incorrect=0, last_answered=NULL where user_id=%s and quiz_id in (" + placeholders + ")",
      [g.uuid] + quizidList)

  return jsonify({'count': len(quizidList), 'quizids': quizidList})

@app.route("/discardBookmark", methods=["POST"])
def discardBookmark():
  '''Removes the quiz (and its progress) from the current user's quizzes.'''
  params = request.get_json(force=True) # returns a dict
  quizid = params.get('quizid')

  g.con.execute("delete from quiz_user_detail where quiz_id=%s and user_id=%s", (quizid, g.uuid))
  g.con.execute("delete from user_quiz_bookmark where quiz_id=%s and user_id=%s", (quizid, g.uuid))

  return jsonify({'discarded': quizid})

@app.route("/addQuizToCardbox", methods=["POST"])
def addQuizToCardbox():
  '''Adds a completed quiz's alphagrams to the user's cardbox.
  action 'all' adds every alphagram (correct -> cardbox 1, incorrect -> cardbox 0).
  action 'wrong' adds only the missed alphagrams (-> cardbox 0).
  Alphagrams already in the cardbox are skipped. Returns the count added.'''
  error = {"status": "success"}
  result = { }
  params = request.get_json(force=True)
  quizid = params.get("quizid")
  action = params.get("action", "all")

  if quizid is None or action not in ("all", "wrong"):
    return jsonify([{"numAdded": 0}, {"status": "invalid action"}]), 400

  if action == "wrong":
    stmt = ("select alphagram from quiz_user_detail "
            "where completed = 1 and correct = 0 and quiz_id = %s and user_id = %s")
  else:
    stmt = "select alphagram from quiz_user_detail where quiz_id = %s and user_id = %s"
  g.con.execute(stmt, (quizid, g.uuid))
  alphas = [x[0] for x in g.con.fetchall()]

  g.con.execute("select alphagram from quiz_user_detail where quiz_id = %s and user_id = %s and correct > 0",
                (quizid, g.uuid))
  correctAlphas = [x[0] for x in g.con.fetchall()]

  # Blank keys can never be served from the cardbox, so never add them.
  alphas = [x for x in alphas if not _is_blank(x)]
  correctAlphas = [x for x in correctAlphas if not _is_blank(x)]

  result["numAdded"] = 0
  if alphas:
    url = 'http://cardbox:5000/addManyToCardbox'
    resp = xu.check401(requests.post(url, headers=g.headers,
                                     json={"alphas": alphas, "correctAlphas": correctAlphas})).json()
    result["numAdded"] = resp.get("numAdded", 0)

  result["quizid"] = quizid
  result["action"] = action
  return jsonify([result, error])

@app.route("/subscribe", methods=["POST"])
def subscribe():

  params = request.get_json(force=True) # returns a dict
  subList = params.get('subList', [ ])

  stmt = "delete from sub_user_xref where user_id = %s"
  g.con.execute(stmt, [g.uuid])

  stmt = "insert into sub_user_xref (sub_id, user_id) values (%s, %s)"

  for s in subList:
    g.con.execute(stmt, [s, g.uuid])

  stmt = "select * from sub_user_xref where user_id = %s"
  g.con.execute(stmt, [g.uuid])
  result = [ x[0] for x in g.con.fetchall()]
  return jsonify(result)

@app.route("/activateQuiz", methods=["GET", "POST"])
def activateQuiz():

  params = request.get_json(force=True) # returns a dict
  quizidList = params.get('quizidList', [ ])

  # limit ten quizzes at a time
  if len(quizidList) > 10:
    quizidList = quizidList[0:10]

  for quizid in quizidList:

    # find if this quiz id is not bookmarked
    stmt = "select m.quiz_id from quiz_master m left join user_quiz_bookmark b on (m.quiz_id = b.quiz_id and b.user_id = %s) where b.quiz_id is null and m.quiz_id = %s"
    g.con.execute(stmt, [g.uuid, quizid])
    result = g.con.fetchone()
    if result:
      stmt = "insert into user_quiz_bookmark values (%s, %s, CURDATE())"
      g.con.execute(stmt, [quizid, g.uuid])

    # do the activation
    # "activation" means putting records for the individual questions in quiz_user_detail
    g.con.execute("select count(*) from quiz_user_detail where quiz_id = %s and user_id = %s", (quizid, g.uuid))
    c = int(g.con.fetchone()[0])
    if c > 0:
      g.con.execute("update quiz_user_detail set locked = 0 where quiz_id = %s and user_id = %s", (quizid, g.uuid))
    else:
      # load quiz json
      filename = os.path.join(QUIZJSON_PATH, f"{quizid}.json")
      with open(filename, 'r') as f:
        data = json.load(f)
      # insert into quiz user detail
      for alpha in data["alphagrams"]:
        g.con.execute("insert into quiz_user_detail (id, quiz_id, user_id, alphagram, locked, completed, correct, incorrect) values (NULL, %s, %s, %s, 0, 0, 0, 0)", (quizid, g.uuid, alpha))

  return jsonify({'activated': quizidList})

@app.route("/newQuiz", methods=["GET", "POST"])
def newQuiz():
  result = {}

  params = request.get_json(force=True)
  isCardbox = params.get("isCardbox", True)
  quizid = params.get("quizid", -1)

  cbxScore = None
  if isCardbox:
    result["quizName"] = "Cardbox Quiz"
    url = 'http://cardbox:5000/newQuiz'
    try:
      response = xu.check401(requests.get(url, headers=g.headers, timeout=60))
      response.raise_for_status()
      cbxScore = response.json().get("score", 0)
    except (requests.RequestException, ValueError):
      cbxScore = 0
  else:
    # Get quiz name - use parameterized query
    g.con.execute(
      "select quiz_name from quiz_master where quiz_id = %s",
      (quizid,)
    )
    result["quizName"] = g.con.fetchone()[0]

    # Check if user already has this quiz
    g.con.execute(
      "select count(*) from quiz_user_detail where quiz_id = %s and user_id = %s",
      (quizid, g.uuid)
    )
    c = int(g.con.fetchone()[0])

    if c > 0:
      # Update existing record
      g.con.execute(
        "update quiz_user_detail set locked = 0 where quiz_id = %s and user_id = %s",
        (quizid, g.uuid)
      )
    else:
      # Load quiz json
      filename = os.path.join(QUIZJSON_PATH, f"{quizid}.json")
      with open(filename, 'r') as f:
        data = json.load(f)

      if data["alphagrams"]:
        # Create placeholders for each row: (%s, %s, %s, 0, 0, 0, 0)
        placeholders = ', '.join(['(%s, %s, %s, 0, 0, 0, 0)' for _ in data["alphagrams"]])

        # Flatten the parameters: [quizid, user_id, alpha1, quizid, user_id, alpha2, ...]
        args = []
        for alpha in data["alphagrams"]:
          args.extend([quizid, g.uuid, alpha])

        query = f'''INSERT INTO quiz_user_detail
                (quiz_id, user_id, alphagram, locked, completed, correct, incorrect)
                VALUES {placeholders}'''

        g.con.execute(query, args)

  # Non-cardbox quizzes don't go through cardbox/newQuiz, so fetch the score
  # separately. Cardbox quizzes already got it from the newQuiz response.
  if cbxScore is None:
    url = 'http://cardbox:5000/getCardboxScore'
    try:
      response = xu.check401(requests.get(url, headers=g.headers, timeout=10))
      response.raise_for_status()
      cbxScore = response.json().get("score", 0)
    except (requests.RequestException, ValueError):
      cbxScore = 0

  # Get stats, passing the score we already have so stats doesn't make its own
  # round trip to cardbox to compute startScore.
  url = 'http://stats:5000/getUserStatsToday'
  statsResponse = xu.check401(
    requests.get(url, headers=g.headers, params={"startScore": cbxScore}, timeout=10)).json()

  result["qAnswered"] = statsResponse["questionsAnswered"]
  result["startScore"] = statsResponse["startScore"]
  result["score"] = cbxScore

  return jsonify(result)


def submitMilestoneChat(milestone):
  url = 'http://chat:5000/submitChat'
  data = {'userid': "0",
          'milestoneType': 'user questions',
          'milestoneOf': g.uuid,
          'chatText': f'{g.name} has completed {milestone} questions today.',
          'expire': True}
  xu.check401(requests.post(url, headers=g.headers, json=data))

def mark_correct (alpha, quizid) :

  ''' Schedules a word in cardbox which has been marked correct
  '''
  g.con.execute("update quiz_user_detail set correct=1, incorrect=0, " +
      "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
      "and quiz_id = %s", (alpha, g.uuid, quizid))

def mark_wrong (alpha, quizid) :

  ''' Schedules a word in cardbox which has been marked wrong
  '''
  g.con.execute("update quiz_user_detail set incorrect=1, correct = 0, " +
    "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
    "and quiz_id = %s", (alpha, g.uuid, quizid))

def _requestAlphas(url, payload):
  '''POST to a lexicon generation endpoint and return its JSON body.

     A non-200 response becomes QuizGenerationError so an error body is never
     stored as a question list. A 401 still propagates as DownstreamError.'''
  response = xu.check401(
    requests.post(url, headers=g.headers, json=payload, timeout=60))
  if response.status_code != 200:
    try:
      detail = response.json().get('error', '')
    except (AttributeError, ValueError):
      detail = (response.text or '')[:200]
    raise QuizGenerationError(
      f'{url} returned {response.status_code}: {detail}')
  return response.json()

def _validateBlankKeys(keys, quantity, length):
  '''Reject a blank generation response that is not a full, unique set of
     canonical keys of the requested answer length.'''
  if not isinstance(keys, list) or len(keys) != quantity:
    found = len(keys) if isinstance(keys, list) else type(keys).__name__
    raise QuizGenerationError(
      f'blank generator returned {found} keys, expected {quantity}')
  seen = set()
  for key in keys:
    if not isinstance(key, str) or not key.endswith('?'):
      raise QuizGenerationError(
        f'invalid blank key {key!r} for length {length}')
    core = key[:-1]
    if (len(core) != length - 1
        or not all('A' <= char <= 'Z' for char in core)
        or core != ''.join(sorted(core))):
      raise QuizGenerationError(
        f'invalid blank key {key!r} for length {length}')
    if key in seen:
      raise QuizGenerationError(f'duplicate blank key {key!r}')
    seen.add(key)

def _quizExistsToday(subId):
  '''True when this subscription already has a quiz for the current date.'''
  g.con.execute(
    "select 1 from quiz_master where sub_id = %s "
    "and create_date = CURDATE() limit 1",
    [subId])
  return g.con.fetchone() is not None

def generatePeriodicQuizzes(force=False): # pylint: disable=too-many-locals
  ''' Generates Daily, Weekly, or Monthly quizzes based on info
        in the sub_master table.

      Each subscription is generated at most once per day unless force is
      true. Failed subscriptions are logged and reported, and do not stop the
      remaining quizzes. '''
  datemasks = {"Daily": '%d %b %Y', "Weekly": '#%W %Y', "Monthly": "%b %Y"}
  command = '''select sub_id, descr, quantity, frequency, quiz_type,
                      min_length, max_length from sub_master
             where frequency = %s'''
  g.con.execute(command, ["Daily"])
  quizzes = g.con.fetchall()

  if datetime.now().weekday() == 0:
  # Generate weekly quizzes on Monday
    g.con.execute(command, ["Weekly"])
    quizzes = quizzes + g.con.fetchall()

  if datetime.now().day == 1:
  # Generate monthly quizzes on the first
    g.con.execute(command, ["Monthly"])
    quizzes = quizzes + g.con.fetchall()

  result = {"generated": [], "skipped": [], "failed": []}
  for quiz in quizzes:
    subId, descr, quantity, frequency, quizType, minLength, maxLength = quiz
    if not force and _quizExistsToday(subId):
      result["skipped"].append(subId)
      continue

    lengths = list(range(minLength, maxLength + 1))
    kwargs = {"sub_id": subId, "descr": descr, "quantity": quantity,
              "quiz_type": quizType, "lengths": lengths}
    kwargs['datemask'] = datemasks[frequency]
    try:
      generateQuiz(**kwargs)
      result["generated"].append(subId)
    except xu.DownstreamError:
      raise
    except Exception as e: # pylint: disable=broad-except
      app.logger.exception(
        'Failed to generate quiz %s (sub_id %s)', descr, subId)
      result["failed"].append(
        {"sub_id": subId, "descr": descr, "error": str(e)})

  return result

def generateQuiz(**kwargs):
  ''' Accepts args sub_id, descr, quantity, quiz_type, lengths, datemask
    Creates one quiz from parameters and outputs JSON.

    Blank quizzes (quiz_type 8) ask for keys of the stored answer length;
    other types keep the existing /getRandomAlphas contract. '''

  # Get next quiz_id (this query is safe - no user input)
  g.con.execute("select max(quiz_id) from quiz_master")
  result = g.con.fetchone()
  quizid = 0 if result[0] is None else result[0] + 1
  lengthValue = kwargs["lengths"][0] if len(kwargs["lengths"]) == 1 else None

  if kwargs['quiz_type'] == QUIZ_TYPE_BLANK:
    if lengthValue is None:
      raise QuizGenerationError(
        f'blank quiz {kwargs["descr"]} needs a single length')
    alphagrams = _requestAlphas(
      'http://lexicon:5000/getRandomBlankAlphas',
      {"quantity": kwargs['quantity'], "length": lengthValue,
       "minAnswers": BLANK_MIN_ANSWERS, "maxAnswers": BLANK_MAX_ANSWERS})
    _validateBlankKeys(alphagrams, kwargs['quantity'], lengthValue)
  else:
    alphagrams = _requestAlphas(
      'http://lexicon:5000/getRandomAlphas',
      {"quantity": kwargs['quantity'], 'lengths': kwargs['lengths']})

  quizJSON = {
    "name": f'{kwargs["descr"]} {datetime.now().strftime(kwargs["datemask"])}',
    "alphagrams": alphagrams,
    "id": quizid,
    "size": kwargs['quantity']
  }

  g.con.execute('''UPDATE quiz_master
                   SET sub_id = NULL
                   WHERE sub_id = %s''',
                    [kwargs['sub_id']])

  g.con.execute(
    '''INSERT INTO quiz_master
       (quiz_id, quiz_name, quiz_size, sub_id, creator, create_date,
      quiz_type, length, lexicon, version)
       VALUES (%s, %s, %s, %s, %s, CURDATE(), %s, %s, %s, %s)''',
    (
      quizid,
      quizJSON['name'],
      quizJSON['size'],
      kwargs["sub_id"],
      g.uuid,
      kwargs['quiz_type'],
      lengthValue,
      'CSW',
      24
    )
  )

  # Save JSON file (this part is fine - file operations, not SQL)
  filename = os.path.join(QUIZJSON_PATH, f'{quizid}.json')
  with open(filename, 'w') as f:
    f.write(json.dumps(quizJSON))

def getNonCardboxQuestions (numNeeded, quizid) : # pylint: disable=unused-argument
  """
  Returns a dict with a quiz of numNeeded questions in the format
    { "Alphagram" -> [ Word, Word, Word ] }
  Note questionLength is currently unused but is reserved for future functionality
  """
  # pylint: disable=too-many-arguments,too-many-locals
  quiz = {}
  allQuestions = []
  getCardsQry = ("select alphagram from quiz_user_detail " +
    "where quiz_id = %s and user_id = %s and locked = 0 and completed = 0 limit %s")
  g.con.execute(getCardsQry, (quizid, g.uuid, numNeeded))
  allQuestions = [x[0] for x in g.con.fetchall()]
  if not allQuestions:
    # getManyAnagrams rejects an empty alphagram list with a 400. An empty
    # batch just means the quiz is exhausted; let getQuestions report eof.
    return quiz
  url = 'http://lexicon:5000/getManyAnagrams'
  data = {"alphagrams": allQuestions}
  quiz = xu.check401(requests.post(url, headers=g.headers, json=data)).json()
  return quiz

def checkOut(alpha, quizid, lock):
  g.con.execute(
    '''update quiz_user_detail
       set locked = %s
       where quiz_id = %s
       and user_id = %s
       and alphagram = %s''',
    (int(lock), quizid, g.uuid, alpha)
  )
