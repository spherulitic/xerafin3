import os
from logging.config import dictConfig
import urllib
import json
from datetime import datetime
from flask import jsonify, request, g
import requests
import jwt
import xerafinUtil.xerafinUtil as xu
from quiz import app

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

@app.before_request
def get_user():
  public_key_url = 'http://keycloak:8080/auth/realms/Xerafin'
  with urllib.request.urlopen(public_key_url) as r:
    public_key = json.loads(r.read())['public_key']
    public_key = f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''
  raw_token = request.headers["Authorization"]
  auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = auth_token["sub"]

  g.mysqlcon = xu.getMysqlCon()
  g.con = g.mysqlcon.cursor()
  # headers to send when calling other services
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  return None

@app.after_request
def close_mysql(response):
  g.con.close()
  g.mysqlcon.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Quiz Management Service"


@app.route("/getSubscriptions", methods=["GET", "POST"])
def getSubscriptions():

  result = { }
  result["init"] = { }
  result["subs"] = [ ]

  try:

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

  except:
    xu.errorLog()
    result["error"] = "An error occurred. See log for details."

  return jsonify(result)

@app.route("/getQuestions", methods=["GET", "POST"])
def getQuestions():
  '''Return a list of questions to the client'''
  params = request.get_json(force=True)
  result = {"getFromStudyOrder": False, "questions": [ ] }
  try:
    isCardbox = params.get('isCardbox', True)

    if isCardbox:
      url = 'http://cardbox:5000/getQuestions'
      response = requests.post(url, headers=g.headers, json=params).json()
      return jsonify(response)
    else:
      # Build a non-cardbox quiz
      numQuestions = params.get("numQuestions", 1)
      quizid = int(params.get("quizid", -1))
      lock = params.get("lock", False)
      requestedAlpha = params.get("alpha", None)

    # xerafinLib.getQuestions returns something like { "ALPHAGRAM": [WORD, WORD, WORD] }
    # FYI - the None here is to filter on question length, which is currently disabled

    # Note if requestedAlpha is populated, numQuestions is ignored

#    if requestedAlpha:
#      questions = {requestedAlpha: xerafinLib.getAnagrams(requestedAlpha, userid)}
#    else:
#      questions = xerafinLib.getQuestions(numQuestions, userid, cardbox, None, isCardbox, quizid)
#
#    # This only happens for non-cardbox quizzes
#    # Need a flag to let the interface know the quiz is over
#    # And they're getting fewer questions than requested
#
#    if len(questions) != numQuestions:
#      result["eof"] = True
#    else:
#      result["eof"] = False
#
#    for alpha in questions.keys():
#
#      template = { }
#      template["alpha"] = alpha
#      template["answers"] = questions[alpha]
#      # NB if it's not in cardbox, these fields are missing
#      auxInfo = xerafinLib.getAuxInfo(alpha, userid)
#      if auxInfo:
#        template["correct"] = auxInfo["correct"]
#        template["incorrect"] = auxInfo["incorrect"]
#        template["nextScheduled"] = auxInfo["nextScheduled"]
#        template["cardbox"] = auxInfo["cardbox"]
#        template["difficulty"] = auxInfo["difficulty"]
#      template["words"] = { }
#      if lock:
#        xerafinLib.checkOut(alpha, userid, True,
#                    isCardbox or (quizid==-1 and template["cardbox"] is not None), quizid)
#      for word in template["answers"]:
#        h = xerafinLib.getHooks(word, userid)
#        defn = xerafinLib.getDef(word, userid)
#        innerHooks = xerafinLib.getDots(word, userid)
#        template["words"][word] = [ h[0], h[3], defn, innerHooks, h[2] ]
#      result["questions"].append(template)
#    if isCardbox and xerafinLib.getNextAddedCount(userid) < xerafinLib.getPrefs("newWordsAtOnce", userid):
#      # localhost here referring to the server in this container
#      # This is hacky. I don't care about the response to the request --
#      #                I just want the endpoint to do its thing
#      # Timeout makes it not block but I have to catch the timeout exception
#      # prepareNewWords can take several seconds, and I want to make sure
#      #                I return immediately
#      try:
#        requests.post(url="http://localhost:5000/prepareNewWords",
#                      json={"userid":userid}, timeout=.1)
#      except requests.exceptions.ReadTimeout:
#        pass

  except:
    xu.errorLog()

  return jsonify(result)

@app.route('/submitQuestion', methods=["GET", "POST"])
def submitQuestion():

  error = {"status": "success"}
  result = { }
  params = request.get_json(force=True) # returns a dict

  # quiz -1 is cardbox only
  quizid = params.get("quizid", -1)
  currentCardbox = params.get('cardbox')
  alpha = params.get("question")
  correct = params.get('correct') # boolean
  increment = params.get("incrementQ") # boolean

  # increment means - add one to the question total
  # correct means - put in currentCardbox + 1
  # wrong means - put in cardbox 0
  # to reschedule in current CB, need to pass in cardbox-1

  # NB if the question is a non-cardbox quiz which is ready to be
  # rescheduled in cardbox, the front end will hit submitQuestion() twice
  # This is crazy but a problem for another day - see issue #92

  if increment:
    # call the stats service to increment leaderboard
    url = 'http://stats:5000/increment'
    resp = requests.get(url, headers=g.headers).json()
    result["qAnswered"] = int(resp["questionsAnswered"])
    result["startScore"] = resp["startScore"]

    # MILESTONE CHATS
    # Every 50 up to 500, every 100 up to 1000, every 200 after that

    milestone = ((result["qAnswered"] < 501 and result["qAnswered"]%50==0) or
                (result["qAnswered"] < 1001 and result["qAnswered"]%100==0) or
                (result["qAnswered"]%200==0) or (result["qAnswered"]%500==0))
    if milestone:
      submitMilestoneChat(result["qAnswered"])

  # this is for new Sloth, no quiz, increment only, skip reschedule
  if currentCardbox == -2:
    pass
  elif quizid == -1:
    data = {"alpha": alpha}
  # send cardbox quiz results to the cardbox service to update
    if correct:
      url = 'http://cardbox:5000/correct'
      data['cardbox'] = currentCardbox + 1
    else:
      url = 'http://cardbox:5000/wrong'
    resp = requests.post(url, headers=g.headers, json=data).json()
    result['aux'] = resp['auxInfo']
    result['score'] = resp['score']
  else: # non-cardbox quiz
    if correct:
      correct(alpha, quizid)
    else:
      wrong(alpha, quizid)
    url = 'http://cardbox:5000/getCardboxScore'
    resp = requests.get(url, headers=g.headers).json()
    result['score'] = resp['score']
    url = 'http://cardbox:5000/getAuxInfo'
    result['aux'] = requests.post(url, headers=g.headers, json={"alpha": alpha}).json()

  return jsonify(result)

@app.route("/getQuizList", methods=["GET", "POST"])
def getQuizList():
  '''Returns a dict where the quizid is the keys'''
  params = request.get_json(force=True) # returns a dict
  result = { }

  QUIZ_INACTIVE_TIMER = 4 # how many days before inactive quizzes drop off the list
  QUIZ_TYPE_NEW = 2
  QUIZ_TYPE_VOWEL = 5
  QUIZ_TYPE_PROB = 7

  # Supported search types - myQuizzes, daily, quizid, completed
  try:
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
      command = "select sub_id from sub_user_xref where user_id = %s"
      g.con.execute(command, [g.uuid])
      subList = [x[0] for x in g.con.fetchall()]

      command = "select quiz_id from quiz_master where sub_id in (%s)"
      for s in subList:
        g.con.execute(command, [s])
        row = g.con.fetchone()
        if row:
          quizidSet.add(row[0])

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
             and max(last_answered) > DATE_SUB(CURDATE(), INTERVAL %s DAY)'''
      g.con.execute(stmt, [g.uuid, QUIZ_INACTIVE_TIMER])
      quizidList = [x[0] for x in g.con.fetchall()]

    elif searchType == "daily":

      command = "select quiz_id from quiz_master where quiz_type = 1 and DATE(create_date) between %s and %s and length between %s and %s"
      g.con.execute(command, [minDate, maxDate, minLength, maxLength])
      quizidList = [x[0] for x in g.con.fetchall()]

    elif searchType == "weekly":
      stmt = "select quiz_id from quiz_master where quiz_type = 4 and YEARWEEK(create_date, 1) between YEARWEEK(%s, 1) and YEARWEEK(%s, 1)"
      g.con.execute(stmt, [minDate, maxDate])
      quizidList = [x[0] for x in g.con.fetchall()]

    elif searchType == "monthly":
      stmt = "select quiz_id from quiz_master where quiz_type = 6 and EXTRACT(YEAR_MONTH from create_date) between EXTRACT(YEAR_MONTH from %s) and EXTRACT(YEAR_MONTH from %s)"
      g.con.execute(stmt, [minDate, maxDate])
      quizidList = [x[0] for x in g.con.fetchall()]

    elif searchType == "quizid":
      quizidList = [params.get('quizid')]

    elif searchType == "new":
      stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
      g.con.execute(stmt, [QUIZ_TYPE_NEW, minLength, maxLength])
      quizidList = [x[0] for x in g.con.fetchall()]

    elif searchType == "vowel":
      stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
      g.con.execute(stmt, [QUIZ_TYPE_VOWEL, minLength, maxLength])
      quizidList = [x[0] for x in g.con.fetchall()]

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

    # we have a list of quizids to return. Get the metadata and status

    quizidList = quizidList[:50] # hard limit of 50 results

    for qid in quizidList:

      if qid == -1:
        result[-1] = {"quizid": qid, "quizname": "Cardbox", "quizsize": -1, "untried": -1, "unsolved": -1, "status": "Active"}
      else:
        command = "select quiz_name, quiz_size from quiz_master where quiz_id = %s"
        g.con.execute(command, [qid])
        row = g.con.fetchone()
        template = {}
        template["quizid"] = qid
        template["quizname"] = row[0]
        template["quizsize"] = int(row[1])

        command = "select count(*), sum(completed), sum(sign(correct)), max(last_answered) from quiz_user_detail where user_id = %s and quiz_id = %s"
        g.con.execute(command, [g.uuid, qid])
        row = g.con.fetchone()

        if int(row[0]) == 0:
          template["status"] = "Inactive"
          template["untried"] = template["quizsize"]
          template["unsolved"] = template["quizsize"]
          template["correct"] = 0
          template["incorrect"] = 0

        else:
          template["untried"] = template["quizsize"] - int(row[1])
          if template["untried"] == 0:
            template["status"] = "Completed"
            if row[3]:
              lastCorrect = row[3] # it comes out of mysql as a datetime!
              # if it's completed more than four days ago, drop it off the list entirely
              if (datetime.today() - lastCorrect).days > QUIZ_INACTIVE_TIMER:
                continue
          else:
            template["status"] = "Active"

          template["unsolved"] = template["quizsize"] - int(row[2])
          template["correct"] = int(row[2])
          template["incorrect"] = int(row[1]) - int(row[2])

        stmt = "select count(*) from user_quiz_bookmark where user_id = %s and quiz_id = %s"
        g.con.execute(stmt, [g.uuid, qid])
        template["bookmarked"] = (g.con.fetchone()[0] == 1)
        template["sub"] = (searchType == "myQuizzes" and qid != -1 and not template["bookmarked"] )

        result[template["quizid"]] = template

  except:
    xu.errorLog()

  return jsonify(result)

@app.route("/newQuiz", methods=["GET", "POST"])
def newQuiz():

  result = { }

  params = request.get_json(force=True) # returns dict
  isCardbox = params.get("isCardbox", True)
  quizid = params.get("quizid", -1)

  if isCardbox:
    result["quizName"] = "Cardbox Quiz"
    url = 'http://cardbox:5000/newQuiz'
    requests.get(url, headers=g.headers)
  else:
    g.con.execute(f'select quiz_name from quiz_master where quiz_id = {quizid}')
    result["quizName"] = g.con.fetchone()[0]
    g.con.execute(f"select count(*) from quiz_user_detail where quiz_id = {quizid} and user_id = {g.uuid}")
    c = int(g.con.fetchone()[0])
    if c > 0:
      g.con.execute(f"update quiz_user_detail set locked = 0 where quiz_id = {quizid} and user_id = {g.uuid}")
    else:
      # load quiz json
      filename = os.path.join(QUIZJSON_PATH, f"{quizid}.json")
      with open(filename, 'r') as f:
        data = json.load(f)
      # insert into quiz user detail
      for alpha in data["alphagrams"]:
        g.con.execute(f'''insert into quiz_user_detail (id, quiz_id, user_id, alphagram, locked, completed, correct, incorrect)
                              values (NULL, {quizid}, "{g.uuid}", "{alpha}", 0, 0, 0, 0)''')

  # send back cardbox info always
  url = 'http://cardbox:5000/getCardboxScore'
  cbxResponse = requests.get(url, headers=g.headers).json()
  cbxScore = cbxResponse.get("score", 0)

  g.con.execute(f"select questionsAnswered, startScore from leaderboard where userid = '{g.uuid}' and dateStamp = curdate()")
  row = g.con.fetchone()

  if row is not None:
    result["qAnswered"] = row[0]
    result["startScore"] = row[1]
    result["score"] = cbxScore
  else:
    result["qAnswered"] = 0
    result["startScore"] = cbxScore
    result["score"] = cbxScore

  return jsonify(result)

def submitMilestoneChat(milestone):
  pass
#  SYSTEM_USERID = 0 # Xerafin system uid
#      command = "select name, firstname, lastname from login where userid = %s"
#      con.execute(command, (userid,))
#      row = con.fetchone()
#      if row[1] and row[2]:
#        if row[2] == " ":
#          name = "{0}".format(row[1])
#        else:
#          name = "{0} {1}".format(row[1], row[2])
#      else:
#        name = con.fetchone()[0]
#
#    # Find the previous milestone chat to expire
#      try:
#        command = "select max(timeStamp) from chat where userid = %s and message like %s"
#        con.execute(command, (SYSTEM_USERID, "%{0} has completed %".format(name)))
#        expiredChatTime = con.fetchone()[0]
#        error["milestoneDelete"] = xchat.post(u'0', u'', expiredChatTime, True)
#      except:
#        pass
#
#    msg = "{0} has completed <b>{1}</b> alphagrams today!".format(name, result["qAnswered"])
#    error["milestoneSubmit"] = xchat.post(u'0', msg)

def correct (alpha, quizid) :

  ''' Schedules a word in cardbox which has been marked correct
  '''
  g.con.execute("update quiz_user_detail set correct=1, incorrect=0, " +
      "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
      "and quiz_id = %s", (alpha, g.uuid, quizid))

def wrong (alpha, quizid) :

  ''' Schedules a word in cardbox which has been marked wrong
  '''
  g.con.execute("update quiz_user_detail set incorrect=1, correct = 0, " +
    "last_answered=NOW(), completed=1 where alphagram = %s and user_id = %s " +
    "and quiz_id = %s", (alpha, g.uuid, quizid))
