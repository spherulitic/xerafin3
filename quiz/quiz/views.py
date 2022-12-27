from quiz import app
from flask import jsonify, request, Response, g, session
from logging.config import dictConfig
import urllib, requests, jwt, json
from datetime import datetime
import xerafinUtil.xerafinUtil as xu

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
      stmt = "select quiz_id from quiz_user_detail where user_id = %s group by quiz_id having sum(completed) = count(*)"
      g.con.execute(stmt, [g.uuid])
      completedList = [x[0] for x in g.con.fetchall()]
      for q in completedList:
        quizidSet.discard(q)

      quizidList = list(quizidSet)

      # Cardbox
      quizidList.append(-1)

    elif searchType == "completed":
      stmt = "select quiz_id from quiz_user_detail where user_id = %s group by quiz_id having sum(completed) = count(*) and max(last_answered) > DATE_SUB(CURDATE(), INTERVAL %s DAY)"
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
              last_correct = row[3] # it comes out of mysql as a datetime!
              # if it's completed more than four days ago, drop it off the list entirely
              if (datetime.today() - last_correct).days > QUIZ_INACTIVE_TIMER:
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


#@app.route("/newQuiz", methods=["GET", "POST"])
#def newQuiz():
#
#  result = { }
#
#  try:
#    params = request.get_json(force=True) # returns dict
#    userid = xu.getUseridFromCookies()
#    isCardbox = params.get("isCardbox", True)
#    quizid = params.get("quizid", -1)
#
#    with xu.getMysqlCon().cursor() as con:
#      if isCardbox:
#        result["quizName"] = "Cardbox Quiz"
#        xl.newQuiz(userid)
#      else:
#        con.execute("select quiz_name from quiz_master where quiz_id = %s", (quizid,))
#        result["quizName"] = con.fetchone()[0]
#        con.execute("select count(*) from quiz_user_detail where quiz_id = %s and user_id = %s", (quizid, userid))
#        c = int(con.fetchone()[0])
#        if c > 0:
#          con.execute("update quiz_user_detail set locked = 0 where quiz_id = %s and user_id = %s", (quizid, userid))
#        else:
#          # load quiz json
#          filename = os.path.join(QUIZJSON_PATH, "{}.json".format(quizid))
#          with open(filename, 'r') as f:
#            data = json.load(f)
#          # insert into quiz user detail
#          for alpha in data["alphagrams"]:
#            con.execute("insert into quiz_user_detail (id, quiz_id, user_id, alphagram, locked, completed, correct, incorrect) values (NULL, %s, %s, %s, 0, 0, 0, 0)", (quizid, userid, alpha))
#
#      # send back cardbox info always
#      con.execute("select questionsAnswered, startScore from leaderboard where userid = %s and dateStamp = curdate()", (userid,))
#      row = con.fetchone()
#      if row is not None:
#        result["qAnswered"] = row[0]
#        result["startScore"] = row[1]
#        result["score"] = xl.getCardboxScore(userid)
#      else:
#        result["qAnswered"] = 0
#        result["startScore"] = xl.getCardboxScore(userid)
#        result["score"] = result["startScore"]
#
#  except Exception as ex:
#    xu.errorLog()
#    result["error"] = "An error occurred. See log for details."
#
#  return jsonify(result)
