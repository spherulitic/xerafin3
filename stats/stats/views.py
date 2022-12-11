from stats import app
from flask import request, jsonify, Response, g, session
import json, urllib, requests, jwt
from logging.config import dictConfig
import sys
import xerafinUtil.xerafinUtil as xs
#from .rankings import Rankings
#from .slothRankings import SlothRankings
#from .awards import Awards
#from .metaranks import Metaranks

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
  g.auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = g.auth_token["sub"]

  g.mysqlcon = xs.getMysqlCon()
  g.con = g.mysqlcon.cursor()

  return None

@app.after_request
def close_mysql(response):
  g.con.close()
  g.mysqlcon.close()
  return response


@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Stats Service"

@app.route("/getRankings", methods=['GET', 'POST'])
def getRankings():
  return jsonify(["Dummy response"])
  try:
    data = request.get_json(force=True)

    # data should contain such items as:
    #   displayType
    #   pageSize  - int
    #   pageNumber - int
    #   timeframe {today, yesterday, thisWeek, lastWeek, thisMonth,
    #              lastMonth, thisYear, lastYear, eternity}
    #   type
    #   year
    #   view {QA, AW, SL}

    if data.get("view", "QA") == "QA":
      if data.get("displayType", 0) in (2, 3):
  #      rank = new Metaranks(data)
        pass
      else:
  #      rank = new Rankings(data)
        pass
    elif data.get("view", "QA") == "AW":
  #    rank = new Awards(data)
      pass
    elif data.get("view", "QA") == "SL":
  #    rank = new SlothRankings(data)
      pass
    else:
  #    rank = new Rankings(data)
      pass

  except:
    xs.errorLog()
    error["status"] = "An error occurred. See log for more details"

#  return jsonify(rank.get_data())
  return jsonify(["Dummy response"])

@app.route("/getAllTimeStats", methods=['GET', 'POST'])
def getAllTimeStats():

  result = { }
  error = { }

  try:
    command = "select ifnull(sum(questionsAnswered), 0), ifnull(count(distinct userid), 0) from leaderboard"
    g.con.execute(command)
    row = g.con.fetchone()
    if row:
      result["questions"] = int(row[0])
      result["users"] = int(row[1])
    else:
      result["questions"] = 0
      result["users"] = 0

  except Exception as ex:
    xs.errorLog()
    error["status"] = "An error occurred. See log for more details"

  response = jsonify(result)
  return response
