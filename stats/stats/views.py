from math import ceil
from logging.config import dictConfig
from datetime import datetime, timedelta
from functools import lru_cache
import json
import urllib
import requests
import jwt
import time
from typing import Dict, Any, Tuple, Optional
from flask import request, jsonify, g
from dateutil.relativedelta import relativedelta, MO
import traceback
import xerafinUtil.xerafinUtil as xu
from stats import app

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]
PERIODS = ["daily","weekly","monthly","yearly"] + DAYS + MONTHS
RANKING_PERIODS = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth",
                   "lastMonth", "thisYear", "lastYear", "eternity"]

AWARDS_DIR = '/app/awards'

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


  g.photo = 'images/unknown_player.gif'
  g.countryId = auth_token.get('cardboxPrefs', {}).get('countryId', 0)
  g.handle = auth_token.get('preferred_username', g.name)
  # headers to send to other services
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  g.mysqlcon = xu.getMysqlCon()
  g.con = g.mysqlcon.cursor()

  return None

@app.after_request
def closeMysql(response):
  ''' Commit and close MySQL connection before we return the response '''
  g.mysqlcon.commit()
  g.con.close()
  g.mysqlcon.close()
  return response


@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Stats Service"

@app.route("/getRankings", methods=['GET', 'POST'])
def getRankings():
  ''' Endpoint to return any sort of rankings data to the client '''
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
      rank = Metaranks(data)
    else:
      rank = Rankings(data)
  elif data.get("view", "QA") == "AW":
    rank = Awards(data)
  elif data.get("view", "QA") == "SL":
    rank = SlothRankings(data)
  else:
    rank = Rankings(data)

  return jsonify(rank.getRankings())

@app.route("/getAllTimeStats", methods=['GET', 'POST'])
def getAllTimeStats():
  ''' Endpoint to send sitewide all-time stats to the client '''

  result = { }

  command = """select ifnull(sum(questionsAnswered), 0), ifnull(count(distinct userid), 0)
             from leaderboard"""
  g.con.execute(command)
  row = g.con.fetchone()
  if row:
    result["questions"] = int(row[0])
    result["users"] = int(row[1])
  else:
    result["questions"] = 0
    result["users"] = 0

  response = jsonify(result)
  return response

@app.route("/increment", methods=['GET', 'POST'])
def increment():
  ''' Increments the total questions solved today for the requesting user
       in the daily leaderboard
      Returns [qAnswered, startScore]
  '''
  g.con.execute(f'''update leaderboard set questionsAnswered = questionsAnswered + 1
                    where userid = '{g.uuid}' and dateStamp = curdate()''')
  if g.con.rowcount == 0:
    url = 'http://cardbox:5000/getCardboxScore'
    resp = requests.get(url, headers=g.headers).json()
    startScore = resp["score"]
    questionsAnswered = 1
    g.con.execute(f'''insert into leaderboard (userid, dateStamp, questionsAnswered, startScore)
                      values ('{g.uuid}', curdate(), {questionsAnswered}, {startScore})''')
    return jsonify({'questionsAnswered': questionsAnswered, 'startScore': startScore})

  return (getUserStatsToday())

@app.route("/resetStartScore", methods=['GET', 'POST'])
def reset_start_score():
  ''' When a user uploads a cardbox file, reset the start score for the day
  '''
  try:
    data = request.get_json(force=True)
    new_start_score = data.get("score", 0)
    query = ''' UPDATE leaderboard SET startScore = %s
                WHERE userid = %s AND dateStamp = CURDATE() '''
    g.con.execute(query, (new_start_score, g.uuid))
    rows_affected = g.con.rowcount
    return jsonify({
             "success": True,
             "message": "Start score updated successfully" if rows_affected > 0 else "No matching record found for today",
             "error": None }), 200

  except AttributeError as e:
    app.logger.error(f'Database connection issue: {str(e)}')
    return jsonify({"success": False,
                    "message": "Database connection error",
                    "error": "DB_CONNECTION_ERROR" }), 503
  except Exception as e:
    app.logger.error(f'Unexpected error in reset_start_score: {str(e)}', exc_info=True)
    return jsonify({ "success": False,
                     "message": "Internal server error",
                     "error": "INTERNAL_SERVER_ERROR"}), 500

@app.route("/getUserStatsToday", methods=['GET', 'POST'])
def getUserStatsTodayView():
  ''' Returns questionsAnswered and startScore for the requesting user '''
  return jsonify(getUserStatsToday())

@app.route("/dailySummary", methods=['GET', 'POST'])
def dailySummary():
  ''' Executes end-of day routine -- puts summary data in lb_summary, then posts chat to user '''
  # Insert today's data into lb_summary
  query = '''SELECT COUNT(*), SUM(questionsAnswered) FROM leaderboard
             WHERE dateStamp = curdate() - interval 1 day group by dateStamp'''
  g.con.execute(query)
  row = g.con.fetchone()
  if row:
    users = row[0]
    questions = row[1]
  else:
    users = 0
    questions = 0
  query = f'''INSERT INTO lb_summary (period, dateStamp, questionsAnswered, numUsers)
              VALUES ("DAY", CURDATE() - INTERVAL 1 DAY, {questions}, {users})'''
  g.con.execute(query)
  # Post daily chat to users
  url = 'http://chat:5000/submitChat'
  message = f'Good job Xerfers! Today {users} users solved {questions} alphagrams!'
  data = { 'userid': 0, 'chatText': message, 'expire': False }
  requests.post(url, headers=g.headers, json=data)

  if users == 0:
    return jsonify([])

  # Calculate daily awards

  command = '''select userid, questionsAnswered from leaderboard
            where dateStamp = curdate() - interval 1 day order by questionsAnswered desc'''
  awards = [users, 1000, 100, 20, 8, 4];
  awardNames = ["emerald", "ruby", "sapphire", "gold", "silver", "bronze"]
  awardRanks = [math.ceil(float(users)/x) for x in awards]
  g.con.execute(command)
  results = g.con.fetchall()
  awardIdx = 0
  for rank, row in enumerate(results[:awardRanks[-1]]):
    # This will never run off the end of the array
    while rank >= awardsRanks[awardIdx]:
      awardIdx += 1
    # USER_COIN_LOG:
    # userid, dateStamp, amount, period, reason, coinType, data
    cl_userid = row[0]
    cl_amount = 1
    cl_period = 'DAY'
    cl_reason = 'QA'
    cl_coinType = awardIdx
    cl_data = f'{row[1]}-{rank}'

    command = f'''INSERT INTO user_coin_log VALUES ({cl_userid}, curdate() - interval 1 day,
                  {cl_amount}, "{cl_period}", "{cl_reason}", {cl_coinType}, "{cl_data}")'''
    g.con.execute(command)
    command = f'SELECT COUNT(*) FROM user_coin_total WHERE userid = "{cl_userid}"'
    g.con.execute(command)
    if g.con.fetchone()[0] == 0:
      command = 'INSERT INTO user_coin_total VALUES ("{cl_userid}", 0, 0, 0, 0, 0, 0, 0, 0, curdate() - interval 1 day)'
      g.con.execute(command)
    command = f'''UPDATE user_coin_total SET {awardNames[awardIdx]} = {awardNames[awardIdx]} + 1
                WHERE userid = "{cl_userid}"'''
    g.con.execute(command)
  return jsonify([])

def getUserStatsToday():
  ''' Fetches questionsAnswered and startScore for the requesting user '''
  g.con.execute(f'''select questionsAnswered, startScore from leaderboard
                  where userid = '{g.uuid}' and datestamp = curdate()''')
  row = g.con.fetchone()
  if row:
    questionsAnswered = row[0]
    startScore = row[1]
  else:
    questionsAnswered = 0
    url = 'http://cardbox:5000/getCardboxScore'
    resp = requests.get(url, headers=g.headers).json()
    startScore = resp["score"]

  return {'questionsAnswered': questionsAnswered, 'startScore': startScore}

def getUserData(uuidList):
  ''' Takes in a list of uuids
     Returns a list of dicts
     [ {"userid": uuid, "name": name, "photo": photo}, { .... } ]
   '''

  url = 'http://login:5000/getUserNamesAndPhotos'
  resp = requests.get(url, headers=g.headers, json={"userList": uuidList}).json()
  return resp

def get_users_by_period(period: str, con) -> int:
  """
  Helper function to get user counts for different periods.
  This replaces the getUsersByPeriod function from the legacy code.
  """
  today = datetime.now().date()

  if period == "thisWeek":
    # Start of week (Monday)
    start_of_week = today - timedelta(days=today.weekday())
    query = """
      SELECT COUNT(DISTINCT userid)
      FROM leaderboard
      WHERE dateStamp >= %s AND dateStamp <= %s
    """
    con.execute(query, (start_of_week, today))

  elif period == "thisMonth":
    start_of_month = today.replace(day=1)
    query = """
      SELECT COUNT(DISTINCT userid)
      FROM leaderboard
      WHERE dateStamp >= %s AND dateStamp <= %s
    """
    con.execute(query, (start_of_month, today))

  elif period == "thisYear":
    start_of_year = today.replace(month=1, day=1)
    query = """
      SELECT COUNT(DISTINCT userid)
      FROM leaderboard
      WHERE dateStamp >= %s AND dateStamp <= %s
    """
    con.execute(query, (start_of_year, today))

  elif period == "eternity":
    query = "SELECT COUNT(DISTINCT userid) FROM leaderboard"
    con.execute(query)

  else:
    return 0

  row = con.fetchone()
  return int(row[0]) if row else 0


def get_global_stats(con) -> Dict[str, Any]:
  """Get global statistics about questions answered and users."""
  globe = {"questions": {}, "users": {}}

  # Today's sitewide totals
  today = datetime.now().date()
  query = """
    SELECT
      IFNULL(SUM(questionsAnswered), 0),
      IFNULL(COUNT(DISTINCT userid), 0)
    FROM leaderboard
    WHERE dateStamp = CURDATE()
  """
  con.execute(query)
  row = con.fetchone()
  today_questions = int(row[0]) if row else 0
  today_users = int(row[1]) if row else 0

  globe["questions"]["today"] = today_questions
  globe["users"]["today"] = today_users

  # Yesterday's sitewide totals
  query = """
    SELECT
      IFNULL(SUM(questionsAnswered), 0),
      IFNULL(COUNT(DISTINCT userid), 0)
    FROM leaderboard
    WHERE dateStamp = CURDATE() - INTERVAL 1 DAY
  """
  con.execute(query)
  row = con.fetchone()
  yesterday_questions = int(row[0]) if row else 0
  yesterday_users = int(row[1]) if row else 0

  globe["questions"]["yesterday"] = yesterday_questions
  globe["users"]["yesterday"] = yesterday_users

  # Weekly totals
  weekday = datetime.now().strftime("%A")
  if weekday == "Monday":
    this_week_questions = today_questions
  elif weekday == "Tuesday":
    this_week_questions = today_questions + yesterday_questions
  else:
    query = """
      SELECT IFNULL(SUM(questionsAnswered), 0)
      FROM lb_summary
      WHERE period = 'DAY'
      AND dateStamp < CURDATE() - INTERVAL 1 DAY
      AND YEARWEEK(dateStamp, 5) = YEARWEEK(CURDATE(), 5)
    """
    con.execute(query)
    row = con.fetchone()
    if row and row[0]:
      this_week_questions = int(row[0]) + yesterday_questions + today_questions
    else:
      this_week_questions = yesterday_questions + today_questions

  globe["questions"]["thisWeek"] = this_week_questions
  globe["users"]["thisWeek"] = get_users_by_period("thisWeek", con)

  # Monthly totals
  day_of_month = datetime.now().strftime("%d")
  if day_of_month == "01":
    this_month_questions = today_questions
  elif day_of_month == "02":
    this_month_questions = today_questions + yesterday_questions
  else:
    query = """
      SELECT IFNULL(SUM(questionsAnswered), 0)
      FROM lb_summary
      WHERE period = 'DAY'
      AND dateStamp < CURDATE() - INTERVAL 1 DAY
      AND DATE_FORMAT(dateStamp, '%Y%m') = DATE_FORMAT(CURDATE(), '%Y%m')
    """
    con.execute(query)
    row = con.fetchone()
    if row and row[0]:
      this_month_questions = int(row[0]) + yesterday_questions + today_questions
    else:
      this_month_questions = yesterday_questions + today_questions

  globe["questions"]["thisMonth"] = this_month_questions
  globe["users"]["thisMonth"] = get_users_by_period("thisMonth", con)

  # Annual totals
  month = datetime.now().strftime("%m")
  if month == "01":
    this_year_questions = this_month_questions
  else:
    query = """
      SELECT IFNULL(SUM(questionsAnswered), 0)
      FROM lb_summary
      WHERE period = 'MONTH'
      AND DATE_FORMAT(dateStamp, '%Y') = DATE_FORMAT(CURDATE(), '%Y')
    """
    con.execute(query)
    row = con.fetchone()
    if row and row[0]:
      this_year_questions = int(row[0]) + this_month_questions
    else:
      this_year_questions = this_month_questions

  globe["questions"]["thisYear"] = this_year_questions
  globe["users"]["thisYear"] = get_users_by_period("thisYear", con)

  # Eternity totals
  query = "SELECT IFNULL(SUM(questionsAnswered), 0) FROM lb_summary WHERE period = 'YEAR'"
  con.execute(query)
  row = con.fetchone()
  if row and row[0]:
    eternity_questions = int(row[0]) + this_year_questions
  else:
    eternity_questions = this_year_questions

  globe["questions"]["eternity"] = eternity_questions
  globe["users"]["eternity"] = get_users_by_period("eternity", con)

  return globe


def get_site_records(con) -> Dict[str, Any]:
  """Get site records for maximum questions and users."""
  siterecords = {"maxUsers": {}, "maxQuestions": {}}

  # Get records for each period
  for period in ['DAY', 'WEEK', 'MONTH', 'YEAR']:
    # Max questions
    query = """
      SELECT dateStamp, questionsAnswered
      FROM lb_summary
      WHERE period = %s
      ORDER BY questionsAnswered DESC, dateStamp DESC
      LIMIT 1
    """
    con.execute(query, (period,))
    row = con.fetchone()
    period_key = period.lower()

    if row and row[0] and row[1]:
      siterecords["maxQuestions"][period_key] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }
    else:
      siterecords["maxQuestions"][period_key] = {
        "date": "1969-12-31",
        "questions": 0
      }

    # Max users
    query = """
      SELECT dateStamp, numUsers
      FROM lb_summary
      WHERE period = %s
      ORDER BY numUsers DESC, dateStamp DESC
      LIMIT 1
    """
    con.execute(query, (period,))
    row = con.fetchone()

    if row and row[0] and row[1]:
      siterecords["maxUsers"][period_key] = {
        "date": str(row[0]),
        "users": int(row[1])
      }
    else:
      siterecords["maxUsers"][period_key] = {
        "date": "1969-12-31",
        "users": 0
      }

  # Weekday records
  query = """
    SELECT dateStamp, questionsAnswered
    FROM lb_summary
    WHERE DATE_FORMAT(dateStamp, '%a') = DATE_FORMAT(CURDATE(), '%a')
    AND period = 'DAY'
    ORDER BY questionsAnswered DESC, dateStamp DESC
    LIMIT 1
  """
  con.execute(query)
  row = con.fetchone()

  if row and row[0] and row[1]:
    siterecords["maxQuestions"]["weekday"] = {
      "date": str(row[0]),
      "questions": int(row[1])
    }
  else:
    siterecords["maxQuestions"]["weekday"] = {
      "date": "1969-12-31",
      "questions": 0
    }

  query = """
    SELECT dateStamp, numUsers
    FROM lb_summary
    WHERE DATE_FORMAT(dateStamp, '%a') = DATE_FORMAT(CURDATE(), '%a')
    AND period = 'DAY'
    ORDER BY numUsers DESC, dateStamp DESC
    LIMIT 1
  """
  con.execute(query)
  row = con.fetchone()

  if row and row[0] and row[1]:
    siterecords["maxUsers"]["weekday"] = {
      "date": str(row[0]),
      "users": int(row[1])
    }
  else:
    siterecords["maxUsers"]["weekday"] = {
      "date": "1969-12-31",
      "users": 0
    }

  # Format dates
  date_formats = {
    "year": "%Y",
    "month": "%b %Y",
    "week": "%d %b %Y",
    "day": "%d %b %Y",
    "weekday": "%d %b %Y"
  }

  for record_type in ["maxQuestions", "maxUsers"]:
    for period_key, date_format in date_formats.items():
      if period_key in siterecords[record_type]:
        try:
          dt = datetime.strptime(siterecords[record_type][period_key]["date"], "%Y-%m-%d")
          siterecords[record_type][period_key]["date"] = dt.strftime(date_format)

          if period_key == "week":
            week_end = dt + timedelta(days=6)
            siterecords[record_type][period_key]["dateEnd"] = week_end.strftime(date_format)

          if period_key == "weekday":
            siterecords[record_type][period_key]["weekday"] = dt.strftime("%A")
        except (ValueError, KeyError):
          # Handle date parsing errors gracefully
          pass

  return siterecords


@app.route('/get_site_records', methods=['GET'])
def get_site_records_view():
  """
  Endpoint to get global statistics and site records.
  Returns the same structure as the legacy endpoint.
  """
  result = {}
  error = {"status": None}

  try:
    # Use the connection from Flask's g context
    con = g.con

    # Get global stats
    globe = get_global_stats(con)
    result["globe"] = globe

    # Get site records
    siterecords = get_site_records(con)
    result["siterecords"] = siterecords

    # Add empty object at the end to match legacy output
    response_data = [result, {}]

    return jsonify(response_data)

  except Exception as ex:
    error["status"] = f"An exception of type {type(ex).__name__} occurred. Arguments: {ex.args}"
    return jsonify({"error": error}), 500

def get_user_info_from_keycloak(user_ids):
  """
  Get user information from Keycloak for the given list of user IDs.
  Returns a dictionary mapping user_id -> {"name": ..., "photo": ...}
  """
  if not user_ids:
    return {}

  try:
    users_data = getUserData(user_ids)  # This returns the list of dicts

    # Convert list of dicts to a dictionary for easy lookup
    user_info_map = {}
    for user_data in users_data:
      user_id = user_data.get("userid")
      if user_id:
        user_info_map[user_id] = {
          "name": user_data.get("name", ""),
          "photo": user_data.get("photo", "images/unknown_player.gif")
        }

    return user_info_map

  except Exception as e:
    print(f"Error getting user data from Keycloak: {e}")
    return {}

def get_individual_records_data(con) -> Dict[str, Any]:
  """
  Get individual records for best performers in different time periods.
  Now uses Keycloak instead of the login table.
  """
  indivrecords = {}
  user_ids_to_fetch = {}

  # Collect user IDs from both queries
  queries = []

  # Queries for day and weekday periods
  queries.append(("day", """
    SELECT userid, questionsAnswered, dateStamp
    FROM leaderboard
    ORDER BY questionsAnswered DESC
    LIMIT 1
  """))

  queries.append(("weekday", """
    SELECT userid, questionsAnswered, dateStamp
    FROM leaderboard
    WHERE DATE_FORMAT(dateStamp, '%a') = DATE_FORMAT(CURDATE(), '%a')
    ORDER BY questionsAnswered DESC
    LIMIT 1
  """))

  # Queries for week, month, year, and eternity periods
  period_queries = [
    ("week", "%Y%u", """
      SELECT userid, SUM(questionsAnswered) as total, MIN(dateStamp) as period_start
      FROM leaderboard
      GROUP BY userid, DATE_FORMAT(dateStamp, %s)
      ORDER BY total DESC
      LIMIT 1
    """),
    ("month", "%Y%m", """
      SELECT userid, SUM(questionsAnswered) as total, MIN(dateStamp) as period_start
      FROM leaderboard
      GROUP BY userid, DATE_FORMAT(dateStamp, %s)
      ORDER BY total DESC
      LIMIT 1
    """),
    ("year", "%Y", """
      SELECT userid, SUM(questionsAnswered) as total, MIN(dateStamp) as period_start
      FROM leaderboard
      GROUP BY userid, DATE_FORMAT(dateStamp, %s)
      ORDER BY total DESC
      LIMIT 1
    """),
    ("eternity", None, """
      SELECT userid, SUM(questionsAnswered) as total, NULL as period_start
      FROM leaderboard
      GROUP BY userid
      ORDER BY total DESC
      LIMIT 1
    """)
  ]

  # First pass: execute all queries and collect user IDs
  period_results = {}

  for period, query in queries:
    con.execute(query)
    row = con.fetchone()
    if row and row[0] and row[1]:  # userid and questionsAnswered
      user_id = str(row[0])
      period_results[period] = {
        "user_id": user_id,
        "answered": int(row[1]),
        "date": str(row[2]) if row[2] else "None"
      }
      user_ids_to_fetch[user_id] = True

  for period, date_mask, query_template in period_queries:
    if period == "eternity":
      con.execute(query_template)
    else:
      con.execute(query_template, (date_mask,))

    row = con.fetchone()
    if row and row[0] and row[1]:  # userid and total
      user_id = str(row[0])
      period_results[period] = {
        "user_id": user_id,
        "answered": int(row[1]),
        "date": str(row[2]) if row[2] and row[2] != "None" else "None"
      }
      user_ids_to_fetch[user_id] = True

  # Get all user info from Keycloak in one batch
  user_info_map = get_user_info_from_keycloak(list(user_ids_to_fetch.keys()))

  # Build the response structure with user info
  for period, data in period_results.items():
    user_id = data["user_id"]
    user_info = user_info_map.get(user_id, {})

    indivrecords[period] = {
      "name": user_info.get("name", "Unknown Player"),
      "photo": user_info.get("photo", "images/unknown_player.gif"),
      "answered": data["answered"],
      "date": data["date"]
    }

  # Ensure all periods exist in the response (even if empty)
  for period in ["day", "weekday", "week", "month", "year", "eternity"]:
    if period not in indivrecords:
      indivrecords[period] = {}

  # Format dates according to the specified format
  date_formats = {
    "year": "%Y",
    "month": "%b %Y",
    "week": "%d %b %Y",
    "day": "%d %b %Y",
    "weekday": "%d %b %Y"
  }

  for period, date_format in date_formats.items():
    if (period in indivrecords and indivrecords[period] and
      "date" in indivrecords[period] and indivrecords[period]["date"] != "None"):
      try:
        dt = datetime.strptime(indivrecords[period]["date"], "%Y-%m-%d")
        indivrecords[period]["date"] = dt.strftime(date_format)

        # Add week end date for weekly records
        if period == "week":
          week_end = dt + timedelta(days=6)
          indivrecords[period]["dateEnd"] = week_end.strftime(date_format)

        # Add weekday name for weekday records
        if period == "weekday":
          indivrecords[period]["weekday"] = dt.strftime("%A")

      except (ValueError, KeyError) as e:
        # Log error but don't crash
        app.logger.error(f"Error formatting date for {period}: {e}")
        # Keep original date format
        pass

  return indivrecords

@app.route('/get_individual_records', methods=['GET'])
def get_individual_records():
  try:
    indivrecords = get_individual_records_data(g.con)
    response_data = [{"indivrecords": indivrecords}, {}]
    return jsonify(response_data)
  except Exception as ex:
    app.logger.error(f'Error in get_individual_records endpoint: {ex}')
    app.logger.error(traceback.format_exc())
    return jsonify({"error": str(ex)}), 500

@app.route('/get_my_records', methods=['GET'])
def get_my_records():
  """
  Endpoint for user's personal records and totals.
  Returns both userrecords and usertotals.
  """
  result = {}

  try:

    user_id = g.uuid
    con = g.con

    # ===== USER TOTALS =====
    usertotals = {"questions": {}}

    # Today
    query = """
      SELECT questionsAnswered
      FROM leaderboard
      WHERE dateStamp = CURDATE() AND userid = %s
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    today_questions = int(row[0]) if row and row[0] is not None else 0

    # Yesterday
    query = """
      SELECT questionsAnswered
      FROM leaderboard
      WHERE dateStamp = CURDATE() - INTERVAL 1 DAY AND userid = %s
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    yesterday_questions = int(row[0]) if row and row[0] is not None else 0

    # This week
    weekday = time.strftime("%A")
    if weekday == "Monday":
      this_week_questions = today_questions
    elif weekday == "Tuesday":
      this_week_questions = today_questions + yesterday_questions
    else:
      query = """
        SELECT SUM(questionsAnswered)
        FROM leaderboard
        WHERE YEARWEEK(dateStamp, 5) = YEARWEEK(CURDATE(), 5) AND userid = %s
      """
      con.execute(query, (user_id,))
      row = con.fetchone()
      this_week_questions = int(row[0]) if row and row[0] is not None else 0

    # This month
    day_of_month = time.strftime("%d")
    if day_of_month == "01":
      this_month_questions = today_questions
    elif day_of_month == "02":
      this_month_questions = today_questions + yesterday_questions
    else:
      query = """
        SELECT SUM(questionsAnswered)
        FROM leaderboard
        WHERE DATE_FORMAT(dateStamp, '%%Y%%m') = DATE_FORMAT(CURDATE(), '%%Y%%m')
        AND userid = %s
      """
      con.execute(query, (user_id,))
      row = con.fetchone()
      this_month_questions = int(row[0]) if row and row[0] is not None else 0

    # This year
    month = time.strftime("%m")
    if month == "01":
      this_year_questions = this_month_questions
    else:
      query = """
        SELECT SUM(questionsAnswered)
        FROM leaderboard
        WHERE DATE_FORMAT(dateStamp, '%%Y') = DATE_FORMAT(CURDATE(), '%%Y')
        AND userid = %s
      """
      con.execute(query, (user_id,))
      row = con.fetchone()
      this_year_questions = int(row[0]) if row and row[0] is not None else 0

    # Eternity (all time)
    query = """
      SELECT SUM(questionsAnswered)
      FROM leaderboard
      WHERE userid = %s
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    eternity_questions = int(row[0]) if row and row[0] is not None else 0

    # Build usertotals dictionary
    usertotals["questions"] = {
      "today": today_questions,
      "yesterday": yesterday_questions,
      "thisWeek": this_week_questions,
      "thisMonth": this_month_questions,
      "thisYear": this_year_questions,
      "eternity": eternity_questions
    }

    result["usertotals"] = usertotals

    # ===== USER RECORDS =====
    userrecords = {}

    # Weekday record (best for current weekday)
    query = """
      SELECT dateStamp, questionsAnswered
      FROM leaderboard
      WHERE DATE_FORMAT(dateStamp, '%%a') = DATE_FORMAT(CURDATE(), '%%a')
      AND userid = %s
      ORDER BY questionsAnswered DESC, dateStamp DESC
      LIMIT 1
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    if row and row[0] and row[1] is not None:
      userrecords["weekday"] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }

    # Day record (best single day)
    query = """
      SELECT dateStamp, questionsAnswered
      FROM leaderboard
      WHERE userid = %s
      ORDER BY questionsAnswered DESC, dateStamp DESC
      LIMIT 1
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    if row and row[0] and row[1] is not None:
      userrecords["day"] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }

    # Week record (best week)
    query = """
      SELECT MIN(dateStamp), SUM(questionsAnswered)
      FROM leaderboard
      WHERE userid = %s
      GROUP BY YEARWEEK(dateStamp, 5)
      ORDER BY SUM(questionsAnswered) DESC, MIN(dateStamp) DESC
      LIMIT 1
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    if row and row[0] and row[1] is not None:
      userrecords["week"] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }

    # Month record (best month)
    query = """
      SELECT MIN(dateStamp), SUM(questionsAnswered)
      FROM leaderboard
      WHERE userid = %s
      GROUP BY DATE_FORMAT(dateStamp, '%%Y%%m')
      ORDER BY SUM(questionsAnswered) DESC, MIN(dateStamp) DESC
      LIMIT 1
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    if row and row[0] and row[1] is not None:
      userrecords["month"] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }

    # Year record (best year)
    query = """
      SELECT MIN(dateStamp), SUM(questionsAnswered)
      FROM leaderboard
      WHERE userid = %s
      GROUP BY DATE_FORMAT(dateStamp, '%%Y')
      ORDER BY SUM(questionsAnswered) DESC, MIN(dateStamp) DESC
      LIMIT 1
    """
    con.execute(query, (user_id,))
    row = con.fetchone()
    if row and row[0] and row[1] is not None:
      userrecords["year"] = {
        "date": str(row[0]),
        "questions": int(row[1])
      }

    # Format dates
    date_formats = {
      "year": "%Y",
      "month": "%b %Y",
      "week": "%d %b %Y",
      "day": "%d %b %Y",
      "weekday": "%d %b %Y"
    }

    for period, date_format in date_formats.items():
      if period in userrecords and userrecords[period]:
        try:
          dt = datetime.strptime(userrecords[period]["date"], "%Y-%m-%d")
          userrecords[period]["date"] = dt.strftime(date_format)

          if period == "week":
            week_end = dt + timedelta(days=6)
            userrecords[period]["dateEnd"] = week_end.strftime(date_format)

          if period == "weekday":
            userrecords[period]["weekday"] = dt.strftime("%A")
        except (ValueError, KeyError) as e:
          app.logger.error(f"Error formatting date for {period}: {e}")
          # Keep original date format

    result["userrecords"] = userrecords

    # Return in legacy format: list with data dict and empty dict
    response_data = [result, {}]
    return jsonify(response_data)

  except Exception as ex:
    app.logger.error(f"Error in get_my_records: {ex}")
    app.logger.error(traceback.format_exc())
    error_msg = f"An exception of type {type(ex).__name__} occurred. Arguments: {ex.args}"
    return jsonify({"error": error_msg}), 500

class Metaranks():
  def __init__(self, data):
    # default to the MySQL function curdate()
    self.curdate = data.get("curDate", "curdate()")
    self.displayType = int(data.get("displayType", 2))
    self.pageSize = max(min(int(data.get("pageSize", 10)),50),2)
    self.pageNumber = max(int(data.get("pageNumber", 1)),1)
    self.period = data.get("timeframe", "daily")
    if self.period not in PERIODS:
      self.period = "daily"
    self.currentRank = -1
    self.countUsers()
    self.findUser()
    self.getRankingBounds()
    self.getRankingsData()

  def countUsers(self):
    self.query = f"""SELECT COUNT(userid) FROM (
                     SELECT userid{self.setDateType()}
      FROM leaderboard{self.checkWhere()}{self.setDay()}{self.setMonth()}
      GROUP BY userid{self.getTimeConditionsQuery()}) AS TMP"""

    # note -- the PHP was returning an assoc array with column names mapped to values
    # to do this in Python you need to use cursor.description
    # result is returning cursor.fetchall() which only contains the values
    result = self.runQuery()
    for row in result:
      self.userCount = row[0]

  def getDateFormatForQuery(self):
    dateFormat = "1"
    if self.period == "weekly":
      dateFormat = f"{self.getTimeConditionsQuery()[1:]}=DATE_FORMAT(NOW(),'%Y%u')"
    elif self.period == MONTHS + ["monthly"]:
      dateFormat = f"{self.getTimeConditionsQuery()[1:]}=DATE_FORMAT(NOW(),'%Y%m')"
    elif self.period == "yearly":
      dateFormat = f"{self.getTimeConditionsQuery()[1:]}=DATE_FORMAT(NOW(), '%Y')"
    elif self.period in DAYS + ["daily"]:
      dateFormat = "dateStamp=CURDATE()"
    return dateFormat

  def getTimeConditionsQuery(self):
    fragment = "DATE_FORMAT(dateStamp,"
    if self.period in ["daily"] + DAYS:
      result = ", dateStamp"
    elif self.period == "weekly":
      result = f", {fragment}'%Y%u')"
    elif self.period == "monthly":
      result = f", {fragment}'%Y%m')"
    elif self.period == "yearly":
      result = f", {fragment}'%Y')"
    elif self.period in MONTHS:
      result = f", {fragment}'%Y%m')"
    else:
      result = ""

    return result

  def setDateType(self):
    if self.period in ["daily","monday","tuesday","wednesday","thursday",
                       "friday","saturday","sunday"]:
      result = ", dateStamp AS date"
    elif self.period in ["weekly"]:
      result = ", MIN(dateStamp) AS date"
    elif self.period in ["monthly","yearly","january","february","march","april",
                         "may","june","july","august","september","october",
                         "november","december"]:
      result = ", MIN(dateStamp) AS date"
    else:
      result = ""
    return result


  def setDay(self):
    try:
      dayOfWeek = DAYS.index(self.period)
    except ValueError:
      return ""
    return f"WEEKDAY(dateStamp)={dayOfWeek}"

  def setMonth(self):
    try:
      month = MONTHS.index(self.period)+1
    except ValueError:
      return ""
    return f"MONTH(dateStamp)={month}"

  def runQuery(self):
    ''' Runs the query text in self.query and returns the results '''
    g.con.execute(self.query)
    return g.con.fetchall()

  def findUser(self, findCurrent=True):
    self.query = f""" SELECT userid, SUM(questionsAnswered) AS total {self.setDateType()}
                       FROM leaderboard
                       {self.checkWhere()}{self.setDay()}{self.setMonth()}
                       GROUP BY userid{self.getTimeConditionsQuery()}
                       ORDER BY total DESC, date ASC """
    # columns in result set: [userid, questionsAnswered, date]
    result = self.runQuery()
    myResult = [(i,j[2]) for (i,j) in enumerate(result) if j[0] == g.uuid]
    # if my uuid is in the result set, myResult is now [(<index>, <date>)]
    # if not, myResult is an empty list, which is falsy
    if bool(myResult):
      myRank = myResult[0][0]+1
      myDate = myResult[0][1]
      self.userRank = myRank
      if findCurrent and self.compareDateWithCurrent(myDate):
        self.currentRank = myRank
    else:
      self.userRank = -1

  def checkWhere(self):
    if self.period not in ["daily","weekly","monthly","yearly"]:
      return " WHERE "
    return ""

  def checkAnd(self):
    if self.period not in ["daily","weekly","monthly","yearly"]:
      return " AND "
    return ""

  def compareDateWithCurrent(self, dateIn):
    now = datetime.now()
    if self.period in DAYS:
      # if the date isn't a Monday, grab the previous Monday at 12 pm
      delta = relativedelta(weekday=MO(-1), hour=12, minute=0, second=0, microsecond=0)
      if dateIn.weekday() != 1:
        x = dateIn + delta
      else:
        x = dateIn
      if now.weekday() != 1:
        lastMonday = now + delta
      else:
        lastMonday = now
      return (datetime.date(x) == datetime.date(lastMonday)) and (dateIn.weekday() == now.weekday())
    if self.period in MONTHS + ["monthly"]:
      return now.month == dateIn.month and now.year == dateIn.year
    if self.period == "daily":
      return datetime.date(now) == dateIn
    if self.period == "weekly":
      return now.isocalendar().week == dateIn.isocalendar().week and now.year == dateIn.year
    if self.period == "yearly":
      return now.year == dateIn.year
    return False

  def formatDate(self, dateIn):
    if self.period in ["daily"] + DAYS:
      formattedDate = dateIn.strftime("%d %b %Y")
    elif self.period in ["yearly"] + MONTHS:
      formattedDate = dateIn.strftime("%Y")
    elif self.period == "monthly":
      formattedDate = dateIn.strftime("%b %Y")
    elif self.period == "weekly":
      if dateIn.weekday() == 0:
        dateIn = dateIn + timedelta(weeks=1)
      formattedDate = dateIn.strftime("%d %b %Y")
    else:
      formattedDate = p_date
    return formattedDate

  def getRankingBounds(self):
    ''' This was Rick's code. I have no idea what it does. '''
    if self.displayType == 3:
      bound = self.pageSize
      if bound % 2 == 0:
        self.pageSize += 1
      else:
        bound = bound - 1
      bounds = int(bound / 2)
      if self.currentRank != -1:
        index = self.currentRank
      else:
        index = self.userRank
      if index + bounds > self.userCount:
        self.offset = max(self.userCount - self.pageSize, 0)
      else:
        self.offset = max(index - bounds - 1, 0)
      self.pageTotal = 1
      self.page = 1
    else:
      self.pageTotal = ceil(self.userCount / self.pageSize)
      if self.pageTotal == 0:
        self.pageTotal = 1
      self.page = min(self.pageNumber-1,self.pageTotal)
      self.offset = self.pageSize * self.page

  def getRankingsData(self):
    queryStart = f"""SELECT SUM(questionsAnswered) AS total{self.setDateType()}, userid
               FROM leaderboard"""
    self.query = f"""{queryStart}{self.checkWhere()}{self.setDay()}{self.setMonth()}
               GROUP BY userid {self.getTimeConditionsQuery()}
               ORDER BY total DESC, date ASC
               LIMIT {self.offset},{self.pageSize} """
    result = self.runQuery()
    user_info_list = getUserData([row[2] for row in result])
    user_info_dict = {user["userid"]: user for user in user_info_list}
    rank = self.offset
    self.rankData = [ ]
    foundMe = False
    foundCurrent = False
    for row in result:
      rank += 1
      userid = row[2]
      user_info = user_info_dict.get(userid, {"name": "Mystery User",
                                              "photo": "images/unknown_player.gif",
                                              "countryId": 0})
      rowDict = { "total": row[0],
                  "date": row[1],
                  "userid": row[2],
                  "name": user_info["name"],
                  "photo": user_info["photo"],
                  "countryId": user_info["countryId"]}

      if rowDict["userid"] == g.uuid:
        rowDict["isMe"] = True
        if rank == self.userRank:
          foundMe = True
        if rank == self.currentRank and self.currentRank != -1:
          foundCurrent = True
          rowDict["isCurrent"] = True
      rowDict["rank"] = rank
      self.rankData.append(rowDict)
    if not foundMe and self.userRank != -1:
      self.query = f"""{queryStart} WHERE userid={g.uuid}
                 {self.checkAnd()}{self.setDay()}{self.setMonth()}
              GROUP BY userid, name{self.getTimeConditionsQuery()}
              ORDER BY total DESC, date ASC
              LIMIT 1"""
      result = self.runQuery()
      for row in result:
        rowDict = {"total": row[0], "date": row[1], "userid": row[2]}
        if rowDict["userid"] == g.uuid:
          rowDict["isMe"] = True
          if self.userRank == self.currentRank and self.currentRank != -1:
            foundCurrent = True
            rowDict["isCurrent"] = True
          if self.userRank != -1:
            rowDict["rank"] = self.userRank
          if rowDict["rank"] < self.rankData[0]["rank"]:
            self.rankData.insert(0, rowDict)
          elif foundCurrent and rowDict["rank"] < self.rankData[1]["rank"]:
            self.rankData.insert(1, rowDict)
          else:
            self.rankData.append(rowDict)
    if not foundCurrent and self.currentRank != -1 and self.userRank != -1:
      self.query = f"""{queryStart} WHERE userid={g.uuid}{self.checkAnd()}
                       {self.setDay()}{self.setMonth()} AND {self.getDateFormatForQuery()}
                GROUP BY userid, name{self.getTimeConditionsQuery()}
                ORDER BY total DESC, date ASC
                LIMIT 1 """
      result = self.runQuery()
      for row in result:
        rowDict = {"total": row[0], "date": row[1], "userid": row[2]}
        if rowDict["userid"] == g.uuid:
          rowDict["isMe"] = True
          rowDict["isCurrent"] = True
          rowDict["rank"] = self.currentRank
          if rowDict["rank"] < self.rankData[0]["rank"]:
            self.rankData.insert(0, rowDict)
          elif rowDict["rank"] < self.rankData[1]["rank"] and not foundCurrent:
            self.rankData.insert(1, rowDict)
          else:
            self.rankData.append(rowDict)

  def getRankings(self):
    rankingsList = [ ]
    for row in self.rankData:
      userData = { }
      subData = {'answered': row['total']}
      if 'isMe' in row:
        subData["photo"] = g.photo
        subData["name"] = g.name
        userData['countryId'] = g.countryId
        userData["isMe"] = row["isMe"]
      else:
        subData['photo'] = row['photo']
        subData['name'] = row['name']
        userData['countryId'] = row.get('countryId', '0')

      userData['rank'] = row['rank']
      userData['date'] = self.formatDate(row['date'])
      userData['users'] = [ subData ]
      if 'isCurrent' in row:
        userData['isCurrent'] = row['isCurrent']

      rankingsList.append(userData)
    result = { "rankings": rankingsList, "myRank": self.userRank, "myCurrent": self.currentRank,
               "period": self.period, "users": self.userCount, "page": self.page+1}
    return result

class Awards():
  def __init__(self, data):
    self.displayType = 0
    self.offset = 0
    self.userCount = 0
    self.userRank = -1
    self.inData = { }
    self.outData = [ ]
    self.type = 0
    if "year" in data:
      try:
        self.year = int(data["year"])
      except ValueError:
        self.year = 0
      if (datetime.now().month == 1 and datetime.now().day == 1) or self.year < 2018:
        self.year = 0
    else:
      self.year = 0
    if "type" in data:
      if data["type"] == "most":
        self.type = 1
      else: # type is "top" or default
        self.type = 0
    else:
      self.type = 0
    if "pageSize" in data:
      try:
        self.pageSize = int(data["pageSize"])
      except ValueError:
        self.pageSize = 10
      if self.pageSize < 1 or self.pageSize > 50:
        self.pageSize = 10
    else:
      self.pageSize = 10
    if "pageNumber" in data:
      try:
        self.pageNumber = max(int(data["pageNumber"]), 1)
      except ValueError:
        self.pageNumber = 1
    else:
      self.pageNumber = 1
    if "displayType" in data:
      try:
        self.displayType = int(data["displayType"])
      except ValueError:
        self.displayType = 0
    else:
      self.displayType = 0

    self.readSource()
    self.findUserRank()
    self.getUserAmount()
    self.getRankingBounds()
    self.extractData()

  def readSource(self):
    if self.type == 1:
      file = "awardsMost"
    if self.type == 0:
      file = "awardsTop"
    if self.year == 0:
      file = f'{file}.JSON'
    else:
      file = f'{file}_{self.year}.JSON'
    fname = f'{AWARDS_DIR}/{file}'
    with open(fname) as f:
      self.inData = json.load(f)

  def getRankingBounds(self):
    ''' This was Rick's code. I have no idea what it does. '''
    if self.displayType == 1:
      bound = self.pageSize
      if bound % 2 == 0:
        self.pageSize += 1
      else:
        bound = bound - 1
      bounds = int(bound / 2)
      if self.userRank + bounds > self.userCount:
        self.offset = max(self.userCount - self.pageSize, 0)
      else:
        self.offset = max(self.userRank - bounds - 1, 0)
      self.pagetotal = 1
      self.page = 1
    else:
      self.pageTotal = ceil(self.userCount/self.pageSize)
      if self.pageTotal == 0:
        self.pageTotal = 1
      self.page = min(self.pageNumber-1,self.pageTotal)
      self.offset = self.pageSize * self.page

  def findUserRank(self):
    try:
      self.userRank = [a["rank"] for a in self.inData["rankings"] if a["id"] == g.uuid][0]
    except IndexError:
      self.userRank = -1

  def getRankings(self):
    return self.outData

  def parseOutputParams(self, p_row):
    outp = {'rank':p_row['rank'], 'photo':p_row['photo'], 'name':p_row['name'],
            'countryId':p_row['countryId'], 'values':p_row['values']}
    if 'isMe' in p_row:
      outp['isMe'] = 1
    return outp

  def extractData(self):
    userFound = 0
    result = [ ]
    for index, row in enumerate(self.inData["rankings"][self.offset:min(self.offset+self.pageSize, self.userCount)]):
      if self.offset + index == self.userRank - 1:
        row["isMe"] = 1
        userFound = 1
      result.append(self.parseOutputParams(row))
    if userFound == 0:
      if self.userRank != -1:
        self.inData["rankings"][self.userRank-1]["isMe"] = 1
        if self.userRank < self.offset:
          result.insert(0, self.parseOutputParams(self.inData["rankings"][self.userRank-1]))
        else:
          result.append(self.parseOutputParams(self.inData["rankings"][self.userRank-1]))
    self.outData = {"rankings": result, "users": self.userCount, "lateUpdate": self.inData["lastUpdate"], "page": self.page+1}

  def getUserAmount(self):
    self.userCount = len(self.inData["rankings"])

class Rankings():
  def __init__(self, data):
    if 'curDate' in data:
      self.curDate = data['curDate']
    else:
      self.curDate = "curdate()"
    self.pageSize = 10
    if 'pageSize' in data:
      try:
        if 1 < int(data['pageSize']) <= 50:
          self.pageSize = int(data['pageSize'])
      except ValueError:
        pass
    self.pageNumber = 1
    if 'pageNumber' in data:
      try:
        if int(data['pageNumber']) > 0:
          self.pageNumber = int(data['pageNumber'])
      except ValueError:
        pass
    if 'displayType' in data:
      try:
        self.displayType = int(data['displayType'])
      except ValueError:
        self.displayType = 0
    else:
      self.displayType = 0
    if 'timeframe' in data:
      if data['timeframe'] in RANKING_PERIODS:
        self.period = data['timeframe']
    else:
      self.period = 'today'

    self.countUsers()
    self.findUser()
    self.getRankingBounds()
    self.getRankingsData()

  def getTimeConditionsQuery(self):
    ''' Return a where clause appropriate for the period in self.period '''
    if self.period == 'today':
      clause = 'dateStamp = @datevalue'
    elif self.period == 'yesterday':
      clause = 'dateStamp = @datevalue - INTERVAL 1 DAY'
    elif self.period == 'thisWeek':
      clause = 'WEEK(dateStamp, 7) = WEEK(@datevalue, 7) AND YEARWEEK(dateStamp, 7) = YEARWEEK(@datevalue, 7)'
    elif self.period == 'lastWeek':
      clause = 'WEEK(dateStamp,7) = WEEK(@datevalue - INTERVAL 7 DAY,7) AND YEARWEEK(dateStamp,7) = YEARWEEK(@datevalue - INTERVAL 7 DAY,7)'
    elif self.period == 'thisMonth':
      clause = 'MONTH(dateStamp) = MONTH(@datevalue) AND YEAR(dateStamp) = YEAR(@datevalue)'
    elif self.period == 'lastMonth':
      clause = 'MONTH(dateStamp) = MONTH(@datevalue - INTERVAL 1 MONTH) AND YEAR(dateStamp) = YEAR(@datevalue - INTERVAL 1 MONTH)'
    elif self.period == 'thisYear':
      clause = 'YEAR(dateStamp) = YEAR(@datevalue)'
    elif self.period == 'lastYear':
      clause = 'YEAR(dateStamp) = YEAR(@datevalue - INTERVAL 1 YEAR)'
    else:
      clause = ''
    return clause

  def runQuery(self):
    """Run the mysql query in self.query"""
    g.con.execute(f'SET @datevalue = {self.curDate}')
    g.con.execute(self.query)
    return g.con.fetchall()

  def findUser(self):
    ''' Find the rank of me in today's leaderboard
        There's got to be an easy way to do this in MySQL: see issue #100 '''
    self.query = f'''SELECT SUM(questionsAnswered) AS total, userid
                     FROM leaderboard
                     {self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}
                     GROUP BY userid
                     ORDER BY total DESC'''
    result = self.runQuery()
    myIndex = [i for (i,j) in enumerate(result) if j[1] == g.uuid]
    # at this point, myIndex is [<index>] where it's the index of the row matching my uuid in the result set
    # if no match, myIndex is an empty list which is falsy -- note bool([0]) is True
    if bool(myIndex):
      self.userRank = myIndex[0]+1
    else:
      self.userRank = -1

  def checkEtern(self, insert):
    """Used for query formatting that changes when certain whereclauses aren't needed"""
    if self.period != 'eternity':
      return f' {insert} '
    return ''

  def countUsers(self):
    ''' Return number of users in leaderboard for the given period '''
    self.query = f'SELECT COUNT(DISTINCT userid) AS users FROM leaderboard{self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}'
    result = self.runQuery()
    for row in result:
      self.userCount = row[0]

  def getRankingBounds(self):
    ''' This was Rick's code. I have no idea what it does. '''
    if self.displayType == 1:
      bound = self.pageSize
      if bound % 2 == 0:
        self.pageSize += 1
      if bound % 2 != 0:
        bound = bound - 1
      bounds = int(bound / 2)
      self.offset = max(self.userRank - bounds - 1, 0)
      if self.userRank + bounds > self.userCount:
        self.offset = max(self.userCount - self.pageSize, 0)
      self.pageTotal = 1
      self.page = 1
    else:
      self.pageTotal = ceil(self.userCount / self.pageSize)
      if self.pageTotal == 0:
        self.pageTotal = 1
      self.page = min(self.pageNumber-1, self.pageTotal)
      self.offset = self.pageSize * self.page

  def getRankingsData(self):
    """Process rankings data from the database"""
    queryStart = 'SELECT SUM(questionsAnswered) AS total, userid FROM leaderboard '
    self.query = f'''{queryStart}{self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}
                    GROUP BY userid ORDER BY total DESC
                    LIMIT {self.offset},{self.pageSize}'''
    result = self.runQuery()
    self.rankData = [ ]
    user_info_list = getUserData([row[1] for row in result])
    user_info_dict = {user["userid"]: user for user in user_info_list}
    foundMe = False
    for index, row in enumerate(result):
      userid = row[1]
      user_info = user_info_dict.get(userid, {"name": "Mystery User",
                                              "photo": "images/unknown_player.gif",
                                              "countryId": 0})
      rowDict = { "total": row[0],
                  "userid": row[1],
                  "name": user_info["name"],
                  "photo": user_info["photo"],
                  "countryId": user_info["countryId"]}
      if rowDict["userid"] == g.uuid:
        rowDict['isMe'] = True
        foundMe = True
      rowDict['rank'] = self.offset + index + 1
      self.rankData.append(rowDict)
    if not foundMe:
      self.query = f'''{queryStart} WHERE userid='{g.uuid}'{self.checkEtern('AND')}{self.getTimeConditionsQuery()}
                    GROUP BY userid ORDER BY total DESC LIMIT 1'''
      result = self.runQuery()
      # I think no rows returned gets me an empty list
      if result:
        row = result[0]
        rowDict = {"total": row[0], "userid": row[1]}
        rowDict['isMe'] = True
        if self.userRank:
          rowDict['rank'] = self.userRank
        if rowDict['rank'] < self.rankData[0]['rank']:
          self.rankData.insert(0, rowDict)
        else:
          self.rankData.append(rowDict)

  def getRankings(self):
    """Format the data structures to output to the client"""
    rankingsList = [ ]
    for row in self.rankData:
      userData = { }
      subData = {'answered': row['total']}
      if 'isMe' in row:
        subData["photo"] = g.photo
        subData["name"] = g.name
        userData['countryId'] = g.countryId
        userData["isMe"] = row["isMe"]
      else:
        subData['photo'] = row['photo']
        subData['name'] = row['name']
        userData['countryId'] = row.get('countryId', "0")

      userData['rank'] = row['rank']
      userData['users'] = [ subData ]

      rankingsList.append(userData)
    result = { "rankings": rankingsList, "myRank": self.userRank,
               "period": self.period, "users": self.userCount, "page": self.page+1}
    return result

class SlothRankings():
  def __init__(self, data):
    self.curDate = data.get('curDate', 'curdate()')
    self.type = data.get('type', '100s')
    self.pageSize = data.get('pageSize', 10)
    try:
      self.pageSize = int(self.pageSize)
      if 1 < self.pageSize <= 50:
        pass
      else:
        self.pageSize = 10
    except ValueError:
      self.pageSize = 10
    self.pageNumber = data.get('pageNumber', 1)
    try:
      self.pageNumber = min(int(self.pageNumber), 1)
    except ValueError:
      self.pageSize = 1
    self.displayType = data.get('displayType', 0)
    try:
      self.displayType = int(self.displayType)
    except ValueError:
      self.displayType = 0
    self.period = data.get('timeframe', 'today')
    if self.period not in RANKING_PERIODS:
      self.period = 'today'

    self.countUsers()
    self.findUser()
    self.getRankingBounds()
    self.getRankingsData()

  def getTimeConditionsQuery(self):
    if self.period == 'today':
      clause = 'date = @datevalue'
    elif self.period == 'yesterday':
      clause = 'date = @datevalue - INTERVAL 1 DAY'
    elif self.period == 'thisWeek':
      clause = 'WEEK(date, 7) = WEEK(@datevalue, 7) AND YEARWEEK(date, 7) = YEARWEEK(@datevalue, 7)'
    elif self.period == 'lastWeek':
      clause = 'WEEK(date,7) = WEEK(@datevalue - INTERVAL 7 DAY,7) AND YEARWEEK(date,7) = YEARWEEK(@datevalue - INTERVAL 7 DAY,7)'
    elif self.period == 'thisMonth':
      clause = 'MONTH(date) = MONTH(@datevalue) AND YEAR(date) = YEAR(@datevalue)'
    elif self.period == 'lastMonth':
      clause = 'MONTH(date) = MONTH(@datevalue - INTERVAL 1 MONTH) AND YEAR(date) = YEAR(@datevalue - INTERVAL 1 MONTH)'
    elif self.period == 'thisYear':
      clause = 'YEAR(date) = YEAR(@datevalue)'
    elif self.period == 'lastYear':
      clause = 'YEAR(date) = YEAR(@datevalue - INTERVAL 1 YEAR)'
    elif self.period == 'eternity':
      clause = '1'
    else:
      clause = ''
    return clause

  def getSlothSubFilter(self):
    if self.type in ['unique', 'all']:
      result = "1"
    elif self.type in ['100s', 'all100s']:
      result = "correct>=100"
    elif self.type in ['perfect', 'allPerfect']:
      result = "correct>=100 AND accuracy>=100"
    else:
      result = "1"
    return result

  def getSlothSubSelect(self):
    if self.type in ['unique', '100s', 'perfect']:
      result = "DISTINCT "
    elif self.type in ['all', 'all100s', 'allPerfect']:
      result = ""
    else:
      result = "DISTINCT "
    return result

  def runQuery(self):
    """Run the mysql query in self.query"""
    g.con.execute(f'SET @datevalue = {self.curDate}')
    g.con.execute(self.query)
    return g.con.fetchall()

  def findUser(self):
    self.query = f'''SELECT COUNT({self.getSlothSubSelect()} alphagram) AS total, userid
                   FROM sloth_completed
                   WHERE {self.getTimeConditionsQuery()} AND {self.getSlothSubFilter()}
                   GROUP BY userid
                   ORDER BY total DESC'''
    result = self.runQuery()
    myIndex = [i for (i,j) in enumerate(result) if j[1] == g.uuid]
    # at this point, myIndex is [<index>] where it's the index of the row matching my uuid in the result set
    # if no match, myIndex is an empty list which is falsy
    if bool(myIndex):
      self.userRank = myIndex[0]+1
    else:
      self.userRank = -1

  def checkEtern(self, insert):
    if self.period != 'eternity':
      return f' {insert} '
    return ''

  def countUsers(self):
    self.query = f'''SELECT COUNT(DISTINCT userid) AS users
                   FROM sloth_completed
                   WHERE {self.getTimeConditionsQuery()} AND {self.getSlothSubFilter()}'''
    result = self.runQuery()
    for row in result:
      self.userCount = row[0]

  def getRankingBounds(self):
    ''' This was Rick's code. I have no idea what it does. '''
    if self.displayType == 1:
      bound = self.pageSize
      if bound % 2 == 0:
        self.pageSize += 1
      if bound % 2 != 0:
        bound = bound - 1
      bounds = int(bound / 2)
      self.offset = max(self.userRank - bounds - 1, 0)
      if self.userRank + bounds > self.userCount:
        self.offset = max(self.userCount - self.pageSize, 0)
      self.pageTotal = 1
      self.page = 1
    else:
      self.pageTotal = ceil(self.userCount / self.pageSize)
      if self.pageTotal == 0:
        self.pageTotal = 1
      self.page = min(self.pageNumber-1, self.pageTotal)
      self.offset = self.pageSize * self.page

  def getRankingsData(self):
    ''' Query the rankings data and load it into self.rankData '''
    queryStart = f'''SELECT COUNT({self.getSlothSubSelect()}alphagram) AS total, userid
                    FROM sloth_completed'''
    self.query = f'''{queryStart}
                    WHERE {self.getTimeConditionsQuery()} AND {self.getSlothSubFilter()}
                    GROUP BY userid
                    ORDER BY total DESC
                    LIMIT {self.offset},{self.pageSize}'''
    result = self.runQuery
    self.rankData = [ ]
    user_info_list = getUserData([row[1] for row in result])
    user_info_dict = {user["userid"]: user for user in user_info_list}
    foundMe = False
    for index, row in enumerate(result):
      userid = row[1]
      user_info = user_info_dict.get(userid, {"name": "Mystery User",
                                              "photo": "images/unknown_player.gif",
                                              "countryId": 0})
      rowDict = { "total": row[0],
                  "userid": row[1],
                  "name": user_info["name"],
                  "photo": user_info["photo"],
                  "countryId": user_info["countryId"]}
      if rowDict["userid"] == g.uuid:
        rowDict['isMe'] = True
        foundMe = True
      rowDict['rank'] = self.offset + index + 1
      self.rankData.append(rowDict)
    if not foundMe:
      self.query = f'''{queryStart} WHERE userid='{g.uuid}'
                       AND {self.getSlothSubFilter()} AND {self.getTimeConditionsQuery()}
                       GROUP BY userid ORDER BY total DESC LIMIT 1'''
      result = self.runQuery()
      # I think no rows returned gets me an empty list
      if result:
        row = result[0]
        rowDict = {"total": row[0], "userid": row[1]}
        rowDict['isMe'] = True
        if self.userRank:
          rowDict['rank'] = self.userRank
        if rowDict['rank'] < self.rankData[0]['rank']:
          self.rankData.insert(0, rowDict)
        else:
          self.rankData.append(rowDict)

  def getRankings(self):
    """Format the data structures to output to the client"""
    rankingsList = [ ]
    for row in self.rankData:
      userData = { }
      subData = {'answered': row['total']}
      if 'isMe' in row:
        subData["photo"] = g.photo
        subData["name"] = g.name
        userData['countryId'] = g.countryId
        userData["isMe"] = row["isMe"]
      else:
        subData['photo'] = row['photo']
        subData['name'] = row['name']
        userData['countryId'] = row.get('countryId', '0')

      userData['rank'] = row['rank']
      userData['users'] = [ subData ]

      rankingsList.append(userData)
    result = { "rankings": rankingsList, "myRank": self.userRank,
               "period": self.period, "users": self.userCount, "page": self.page+1}
    return result
