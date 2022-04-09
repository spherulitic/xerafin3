from quiz import app
from flask import jsonify, request, Response
from logging.config import dictConfig
import sys, time, datetime, os
import xerafinUtil.xerafinUtil as xu
import xerafinLib.xerafinLib as xl

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

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Quiz Management Service"


@app.route("/getQuizList", methods=["GET", "POST"])
def getCardboxStats():
  try:
    mysqlcon = xu.getMysqlCon()
    con = mysqlcon.cursor()

    userid = xu.getUseridFromCookies()

    params = request.get_json(force=True) # returns dict
    result = { } # this will return a dict where quizids are the keys

    QUIZ_INACTIVE_TIMER = 4 # how many days before inactive quizzes drop off the list
    QUIZ_TYPE_NEW = 2
    QUIZ_TYPE_VOWEL = 5
    QUIZ_TYPE_PROB = 7

    # Supported search types - myQuizzes, daily, quizid, completed
    searchType = params.get("searchType", "emptyList")
    minLength = params.get("minLength", 2)
    maxLength = params.get("maxLength", 15)

    if searchType == "emptyList":
      quizidList = []

    elif searchType == "myQuizzes":
    # Subscriptions
    # Bookmarks
    # Cardbox

      # Subscriptions
      command = "select sub_id from sub_user_xref where user_id = %s"
      con.execute(command, [userid])
      subList = [x[0] for x in con.fetchall()]


      quizidSet = set()
      command = "select quiz_id from quiz_master where sub_id in (%s)"
      for s in subList:
        con.execute(command, [s])
        row = con.fetchone()
        if row:
          quizidSet.add(row[0])

      # User Bookmarks
      command = "select quiz_id from user_quiz_bookmark where user_id = %s"
      con.execute(command, [userid])
      quizidSet = quizidSet | set([x[0] for x in con.fetchall()])

      # no completed quizzes in My Quizzes. The front end wants them separate
      stmt = "select quiz_id from quiz_user_detail where user_id = %s group by quiz_id having sum(completed) = count(*)"
      con.execute(stmt, [userid])
      completedList = [x[0] for x in con.fetchall()]
      for q in completedList:
        quizidSet.discard(q)

      quizidList = list(quizidSet)

      # Cardbox
      quizidList.append(-1)

    elif searchType == "completed":
      stmt = "select quiz_id from quiz_user_detail where user_id = %s group by quiz_id having sum(completed) = count(*) and max(last_answered) > DATE_SUB(CURDATE(), INTERVAL %s DAY)"
      con.execute(stmt, [userid, QUIZ_INACTIVE_TIMER])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "daily":
      minDate = params["minDate"]
      maxDate = params["maxDate"]

      command = "select quiz_id from quiz_master where quiz_type = 1 and DATE(create_date) between %s and %s and length between %s and %s"
      con.execute(command, [minDate, maxDate, minLength, maxLength])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "weekly":
      minDate = params["minDate"]
      maxDate = params["maxDate"]
      stmt = "select quiz_id from quiz_master where quiz_type = 4 and YEARWEEK(create_date, 1) between YEARWEEK(%s, 1) and YEARWEEK(%s, 1)"
      con.execute(stmt, [minDate, maxDate])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "monthly":
      minDate = params["minDate"]
      maxDate = params["maxDate"]
      stmt = "select quiz_id from quiz_master where quiz_type = 6 and EXTRACT(YEAR_MONTH from create_date) between EXTRACT(YEAR_MONTH from %s) and EXTRACT(YEAR_MONTH from %s)"
      con.execute(stmt, [minDate, maxDate])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "quizid":
      quizidList = [params["quizid"]]

    elif searchType == "new":
      stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
      con.execute(stmt, [QUIZ_TYPE_NEW, minLength, maxLength])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "vowel":
      stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s order by length"
      con.execute(stmt, [QUIZ_TYPE_VOWEL, minLength, maxLength])
      quizidList = [x[0] for x in con.fetchall()]

    elif searchType == "probability":
      try:
        minProb = params["minProb"]
        maxProb = params["maxProb"]
      except:
        minProb = None
        maxProb = None
      stmt = "select quiz_id from quiz_master where quiz_type = %s and length between %s and %s"
      args = [QUIZ_TYPE_PROB, minLength, maxLength]
      if minProb is not None:
        stmt = stmt + " and max_prob > %s and min_prob < %s"
        args = args + [minProb, maxProb]
      stmt = stmt + " order by length, min_prob"
      con.execute(stmt, args)
      quizidList = [x[0] for x in con.fetchall()]

    # we have a list of quizids to return. Get the metadata and status

    quizidList = quizidList[:50] # hard limit of 50 results

    for qid in quizidList:

      if qid == -1:
        result[-1] = {"quizid": qid, "quizname": "Cardbox", "quizsize": -1, "untried": -1, "unsolved": -1, "status": "Active"}
      else:
        command = "select quiz_name, quiz_size from quiz_master where quiz_id = %s"
        con.execute(command, [qid])
        row = con.fetchone()
        template = {}
        template["quizid"] = qid
        template["quizname"] = row[0]
        template["quizsize"] = int(row[1])

        command = "select count(*), sum(completed), sum(sign(correct)), max(last_answered) from quiz_user_detail where user_id = %s and quiz_id = %s"
        con.execute(command, [userid, qid])
        row = con.fetchone()

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
   #         if row[3]:
   #           last_correct = row[3] # it comes out of mysql as a datetime!
              # if it's completed more than four days ago, drop it off the list entirely
  #            if (datetime.today() - last_correct).days > QUIZ_INACTIVE_TIMER:
  #              continue
          else:
            template["status"] = "Active"

          template["unsolved"] = template["quizsize"] - int(row[2])
          template["correct"] = int(row[2])
          template["incorrect"] = int(row[1]) - int(row[2])

        stmt = "select count(*) from user_quiz_bookmark where user_id = %s and quiz_id = %s"
        con.execute(stmt, [userid, qid])
        template["bookmarked"] = (con.fetchone()[0] == 1)
        template["sub"] = (searchType == "myQuizzes" and qid != -1 and not template["bookmarked"] )

        result[template["quizid"]] = template

  except Exception as ex:
    xu.errorLog()
    result[-1] = "An error occurred. See log for details."
  finally:
    con.close()
    mysqlcon.close()

  return jsonify(result)

@app.route("/getSubscriptions", methods=["GET", "POST"])
def getSubscriptions():

  result = { }
  result["init"] = { }
  result["subs"] = [ ]

  try:
    mysqlcon = xu.getMysqlCon()
    con = mysqlcon.cursor()

    userid = xu.getUseridFromCookies()

    stmt = "select sub_group, descr, sub_id from sub_master order by sub_group, sub_id"
    con.execute(stmt)

    for row in con.fetchall():
      if row[0] not in result["init"]:
        result["init"][row[0]] = { }

      result["init"][row[0]][row[2]] = row[1]

    stmt = "select sub_id from sub_user_xref where user_id = %s"
    con.execute(stmt, [userid])
    dbg = con.fetchall()

    result["subs"] = [x[0] for x in dbg]

  except Exception as ex:
    xu.errorLog()
    result["error"] = "An error occurred. See log for details."
  finally:
    con.close()
    mysqlcon.close()

  return jsonify(result)

@app.route("/newQuiz", methods=["GET", "POST"])
def newQuiz():

  result = { }

  try:
    params = request.get_json(force=True) # returns dict
    userid = xu.getUseridFromCookies()
    isCardbox = params.get("isCardbox", True)
    quizid = params.get("quizid", -1)

    with xu.getMysqlCon().cursor() as con:
      if isCardbox:
        result["quizName"] = "Cardbox Quiz"
        xl.newQuiz(userid)
      else:
        con.execute("select quiz_name from quiz_master where quiz_id = %s", (quizid,))
        result["quizName"] = con.fetchone()[0]
        con.execute("select count(*) from quiz_user_detail where quiz_id = %s and user_id = %s", (quizid, userid))
        c = int(con.fetchone()[0])
        if c > 0:
          con.execute("update quiz_user_detail set locked = 0 where quiz_id = %s and user_id = %s", (quizid, userid))
        else:
          # load quiz json
          filename = os.path.join(QUIZJSON_PATH, "{}.json".format(quizid))
          with open(filename, 'r') as f:
            data = json.load(f)
          # insert into quiz user detail
          for alpha in data["alphagrams"]:
            con.execute("insert into quiz_user_detail (id, quiz_id, user_id, alphagram, locked, completed, correct, incorrect) values (NULL, %s, %s, %s, 0, 0, 0, 0)", (quizid, userid, alpha))

      # send back cardbox info always
      con.execute("select questionsAnswered, startScore from leaderboard where userid = %s and dateStamp = curdate()", (userid,))
      row = con.fetchone()
      if row is not None:
        result["qAnswered"] = row[0]
        result["startScore"] = row[1]
        result["score"] = xl.getCardboxScore(userid)
      else:
        result["qAnswered"] = 0
        result["startScore"] = xl.getCardboxScore(userid)
        result["score"] = result["startScore"]

  except Exception as ex:
    xu.errorLog()
    result["error"] = "An error occurred. See log for details."

  return jsonify(result)
