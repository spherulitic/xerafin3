'''Xerafin cardbox module'''

from cardbox import app
from flask import jsonify, request, Response, g, session
import urllib
import json
import requests
import jwt
#from multiprocessing.dummy import Pool
from logging.config import dictConfig
import sys
import time
import xerafinUtil.xerafinUtil as xu
import sqlite3 as lite

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
  
  return None

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Cardbox Service"

@app.route("/getCardboxScore", methods=['GET', 'POST'])
def getCardboxScore():
  return jsonify({"userid": g.uuid})
#  try:
#    userid = xu.getUseridFromCookies()
#    result = { }
#    error = {"status": "success"}
#
#    result["score"] = xerafinLib.getCardboxScore(userid)
#
#  except Exception as ex:
#    xu.errorLog()
#    error["status"] = "An error occurred. See log for details."
#
#  return jsonify([result, error])

@app.route("/prepareNewWords", methods=['POST'])
def prepareNewWords():
# This can only be called from getQuestions()
# Not exposed through nginx
  xu.debug("Got request to prepare new words")
  time.sleep(3) # latency test
  try:
    params = request.get_json(force=True)
    userid = params.get("userid", -1)

    numNeeded = xerafinLib.getPrefs("newWordsAtOnce", userid)
    error = {"status": "success"}

    with lite.connect(xerafinLib.getDBFile(userid)) as con:
      cur = con.cursor()
      wordsToAdd = xerafinLib.getFromStudyOrder(numNeeded, userid, cur)
      xerafinLib.insertIntoNextAdded(wordsToAdd, userid, cur)

  except Exception as ex:
    xu.errorLog()
    error["status"] = "An error occurred. See log for details."

  return jsonify(error)

@app.route("/getAuxInfo", methods=['POST'])
def getAuxInfo():
  try:
    userid = xu.getUseridFromCookies()
    result = { }
    params = request.get_json(force=True) # returns dict
    result["alpha"] = params.get("alpha")
    result["aux"] = xerafinLib.getAuxInfo(result["alpha"], userid)

  except Exception as ex:
    xu.errorLog()
    result["status"] = "An error occurred. See log for details."

  return jsonify(result)

@app.route("/submitQuestion", methods=['GET', 'POST'])
def submitQuestion():

  try:
    userid = xu.getUseridFromCookies()
    result = { }

    params = request.get_json(force=True) # returns dict
    alpha = params.get("question")
    correct = params.get("correct") # boolean
    currentCardbox = params.get("cardbox")
    xu.updateActive(userid)
    increment = params.get("incrementQ") # boolean - update total questions solved?
    quizid = params.get("quizid", -1) # -1 is cardbox quiz

    # increment means - add one to the question total
    # correct means - put in currentCardbox + 1
    # wrong means - put in cardbox 0
    # to reschedule in current CB, need to pass in cardbox-1

    with xu.getMysqlCon().cursor() as con:
      if increment:
        con.execute("update leaderboard set questionsAnswered = questionsAnswered+1 " +
                    "where userid = %s and dateStamp = curdate()", (userid,))
        if con.rowcount == 0:
          con.execute("insert into leaderboard (userid, dateStamp, questionsAnswered, " +
                      "startScore) values (%s, curdate(), 1, %s)",
                       (userid, xerafinLib.getCardboxScore(userid)))
      con.execute("select questionsAnswered, startScore from leaderboard " +
                  "where userid = %s and dateStamp = curdate()", (userid,))
      row = con.fetchone()
      result["qAnswered"] = row[0]
      result["startScore"] = row[1]

    if currentCardbox == -2:  # this is for new Sloth, no quiz, increment only, skip reschedule
      pass
    elif correct:
      xerafinLib.correct(alpha, userid, currentCardbox+1, quizid)
    else:
      xerafinLib.wrong(alpha, userid, quizid)

    result["aux"] = xerafinLib.getAuxInfo(alpha, userid)
    result["score"] = xerafinLib.getCardboxScore(userid)
######
# This needs to be completely redone once the chat module is set up
# Syntax for sending a request to an endpoint:
# response = requests.post(url="http://localhost/submitChat", data=<dict>)
######
#    # MILESTONE CHATS
#    # Every 50 up to 500, every 100 up to 1000, every 200 after that
#
#    SYSTEM_USERID = 0 # Xerafin system uid
#    milestone = (result["qAnswered"] < 501 and result["qAnswered"]%50==0)
#                 or (result["qAnswered"] < 1001 and result["qAnswered"]%100==0)
#                 or (result["qAnswered"]%200==0) or (result["qAnswered"]%500==0)
#
#    if milestone:
#      with xu.getMysqlCon().cursor() as con:
#        command = "select name, firstname, lastname from login where userid = %s"
#        con.execute(command, (userid,))
#        row = con.fetchone()
#        if row[1] and row[2]:
#          if row[2] == " ":
#            name = "{0}".format(row[1])
#          else:
#            name = "{0} {1}".format(row[1], row[2])
#        else:
#          name = con.fetchone()[0]
#
#      # Find the previous milestone chat to expire
#        try:
#          command = "select max(timeStamp) from chat where userid = %s and message like %s"
#          con.execute(command, (SYSTEM_USERID, "%{0} has completed %".format(name)))
#          expiredChatTime = con.fetchone()[0]
#          result["milestoneDelete"] = xchat.post(u'0', u'', expiredChatTime, True)
#        except:
#          pass
#
#      msg = "{0} has completed <b>{1}</b> alphagrams today!".format(name, result["qAnswered"])
#      result["milestoneSubmit"] = xchat.post(u'0', msg)

  except Exception as ex:
    xu.errorLog()
    result["status"] = "An error occurred. See log for details."

  return jsonify(result)

@app.route("/getQuestions", methods=['GET', 'POST'])
def getQuestions():

  try:
    userid = xu.getUseridFromCookies()
    result = {"getFromStudyOrder": False, "questions": [ ] }


    params = request.get_json(force=True) # returns dict
    numQuestions = params.get("numQuestions", 1)
    isCardbox = params.get("isCardbox", True)
    quizid = int(params.get("quizid", -1))
    cardbox = int(params.get("cardbox", 0))
    lock = params.get("lock", False)
    requestedAlpha = params.get("alpha", None)

    # xerafinLib.getQuestions returns something like { "ALPHAGRAM": [WORD, WORD, WORD] }
    # FYI - the None here is to filter on question length, which is currently disabled

    # Note if requestedAlpha is populated, numQuestions is ignored
    if requestedAlpha:
      questions = {requestedAlpha: xerafinLib.getAnagrams(requestedAlpha, userid)}
    else:
      questions = xerafinLib.getQuestions(numQuestions, userid, cardbox, None, isCardbox, quizid)

    # This only happens for non-cardbox quizzes
    # Need a flag to let the interface know the quiz is over
    # And they're getting fewer questions than requested

    if len(questions) != numQuestions:
      result["eof"] = True
    else:
      result["eof"] = False

    for alpha in questions.keys():

      template = { }
      template["alpha"] = alpha
      template["answers"] = questions[alpha]
      # NB if it's not in cardbox, these fields are missing
      auxInfo = xerafinLib.getAuxInfo(alpha, userid)
      if auxInfo:
        template["correct"] = auxInfo["correct"]
        template["incorrect"] = auxInfo["incorrect"]
        template["nextScheduled"] = auxInfo["nextScheduled"]
        template["cardbox"] = auxInfo["cardbox"]
        template["difficulty"] = auxInfo["difficulty"]
      template["words"] = { }
      if lock:
        xerafinLib.checkOut(alpha, userid, True,
                    isCardbox or (quizid==-1 and template["cardbox"] is not None), quizid)
      for word in template["answers"]:
        h = xerafinLib.getHooks(word, userid)
        defn = xerafinLib.getDef(word, userid)
        innerHooks = xerafinLib.getDots(word, userid)
        template["words"][word] = [ h[0], h[3], defn, innerHooks, h[2] ]
      result["questions"].append(template)
    if isCardbox and xerafinLib.getNextAddedCount(userid) < xerafinLib.getPrefs("newWordsAtOnce", userid):
      # localhost here referring to the server in this container
      # This is hacky. I don't care about the response to the request --
      #                I just want the endpoint to do its thing
      # Timeout makes it not block but I have to catch the timeout exception
      # prepareNewWords can take several seconds, and I want to make sure
      #                I return immediately
      try:
        requests.post(url="http://localhost:5000/prepareNewWords",
                      json={"userid":userid}, timeout=.1)
      except requests.exceptions.ReadTimeout:
        pass
  except Exception as ex:
    xu.errorLog()
    result["status"] = "An error occurred. See log for details."

  return jsonify(result)


@app.route("/getCardboxStats", methods=["GET", "POST"])
def getCardboxStats():
  return jsonify({"Population": "Tire"})
#  try:
#    userid = xu.getUseridFromCookies()
#
#    params = request.get_json(force=True) # returns dict
#
#    due = params.get("due", False)
#    coverage = params.get("coverage", False)
#    overview = params.get("overview", False)
#    earliest = params.get("earliest", False)
#
#    result = { }
#    error = {"status": "success"}
#    now = int(time.time())
#    DAY = 3600 * 24 # length of a day in seconds
#
#    if earliest:
#      earliestDueDate = xerafinLib.getEarliestDueDate(userid)
#      result["earliestDueDate"] = earliestDueDate
#
#    if overview:
#      dueNow = xerafinLib.getCurrentDue(userid,True) # summarize=True to get total w/ no cardbox breakout
#      totalCards = xerafinLib.getTotal(userid)
#      result["totalCards"] = totalCards
#      result["totalDue"] = dueNow["total"]
#
#    if due:
#      dueNow = xerafinLib.getCurrentDue(userid)
#      overdue = xerafinLib.getDueInRange(userid, 0, now)
#      dueToday = xerafinLib.getDueInRange(userid, now, now+DAY)
#      dueThisWeek = xerafinLib.getDueInRange(userid, now, now+(DAY*7))
#      dueByCardbox = {"dueNow": dueNow, "overdue": overdue, "dueToday": dueToday,
#                      "dueThisWeek": dueThisWeek}
#      totalCards = xerafinLib.getTotalByCardbox(userid)
#      result["totalCards"] = totalCards
#      result["score"] = xerafinLib.getCardboxScore(userid)
#      result["queueLength"] = xerafinLib.getNextAddedCount(userid)
#      result["totalDue"] = sum(dueNow.values())
#      result["dueByCardbox"] = dueByCardbox
#
#    if coverage:
#      lexicon = xerafinLib.getLexicon(userid)
#      allLenFreq = { }
#      result["coverage"] = { }
#      totalCards = xerafinLib.getTotalByLength(userid)
#      with xu.getMysqlCon().cursor() as con:
#        command = ( "select length(alphagram), count(distinct alphagram) from "
#                  + lexicon + " group by length(alphagram) order by length(alphagram)" )
#        con.execute(command)
#        for row in con.fetchall():
#          allLenFreq[row[0]] = row[1]
#      for box in totalCards:
#        result["coverage"][box] = {"cardbox": totalCards[box], "total": allLenFreq[box]}
#        pct = (float(totalCards[box])/float(allLenFreq[box])) * 100.0
#        result["coverage"][box]["percent"] = format(pct, '.2f')
#
#  except Exception as ex:
#    xu.errorLog()
#    error["status"] = "An error occurred. See log for details."
#
#  return jsonify([result, error])
# Library functions
