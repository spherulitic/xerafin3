from stats import app
from flask import request, jsonify, Response
from logging.config import dictConfig
import sys
import xerafinUtil.xerafinUtil as xs

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

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Stats Service"

@app.route("/getAllTimeStats", methods=['GET', 'POST'])
def getAllTimeStats():

  result = { }
  error = { }

  try:
    with xs.getMysqlCon() as con:
      cur = con.cursor()
      command = "select ifnull(sum(questionsAnswered), 0), ifnull(count(distinct userid), 0) from leaderboard"
      cur.execute(command)
      row = cur.fetchone()
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
