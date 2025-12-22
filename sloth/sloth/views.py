'''Xerafin sloth module'''

import MySQLdb.cursors
import os
import urllib
import json
import requests
import time
import secrets
from logging.config import dictConfig
from functools import lru_cache
import jwt # pylint: disable=E0401
from flask import jsonify, request, g # pylint: disable=E0401
import xerafinUtil.xerafinUtil as xu
from sloth import app

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

  # headers to send to other services
  g.headers = {"Accept": "application/json", "Authorization": raw_token}

  g.con = xu.getMysqlCon()
  g.cur = g.con.cursor(MySQLdb.cursors.DictCursor)

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
  return "Xerafin Sloth Service"

@app.route("/getSlothRankings", methods=['POST'])
def getRankings():
  try:
    params = request.get_json()
    alpha = params.get('alpha')
    lexicon = 'CSW24'

    rankings = getAlphaRankings(alpha, lexicon)
    return jsonify(rankings)

  except Exception as e:
    app.logger.error(f'Error getting sloth rankings for {alpha}: {e}')
    return jsonify({"error": "Internal server error"}), 500

@app.route("/getSlothStats", methods=['GET'])
def getStats():
  try:
    query = """
      SELECT
        COUNT(DISTINCT alphagram) AS uAttempts,
        COUNT(alphagram) AS tAttempts,
        COUNT(DISTINCT CASE WHEN correct >= 100 THEN alphagram END) AS uComplete,
        COUNT(CASE WHEN correct >= 100 THEN alphagram END) AS tComplete,
        COUNT(DISTINCT CASE WHEN correct >= 100 AND accuracy >= 100 THEN alphagram END) AS uPerfect,
        COUNT(CASE WHEN correct >= 100 AND accuracy >= 100 THEN alphagram END) AS tPerfect
      FROM sloth_completed
      WHERE userid = %s AND date = CURDATE()
    """
    g.cur.execute(query, (g.uuid,))
    row = g.cur.fetchone()

    output = {
      'uAttempts': row['uAttempts'],
      'tAttempts': row['tAttempts'],
      'uComplete': row['uComplete'],
      'tComplete': row['tComplete'],
      'uPerfect': row['uPerfect'],
      'tPerfect': row['tPerfect']
    }

    return jsonify(output)

  except Exception as e:
    app.logger.error(f"Error getting sloth stats: {e}")
    return jsonify({"error": "Internal server error"}), 500

@app.route('/slothWriteActive', methods=['POST'])
def start_game():
  """
  WRITE_ACTIVE - Create new game session
  Returns: { 'token': 'game_token' }
  """
  try:
    data = request.get_json()
    alpha = data.get('alpha')
    lexicon = 'CSW24' # see issue 266

    # Validate input
    if not alpha or not lexicon:
        return jsonify({"error": "Missing alpha or lexicon"}), 400

    # Generate token and timestamp
    token = secrets.token_hex(20)  # Equivalent to bin2hex(openssl_random_pseudo_bytes(20))
    start_time = time.time()  # Equivalent to microtime(true)

    # Insert into database
    query = """
        INSERT INTO sloth_active
        (userid, alphagram, date, start_time, token, lex)
        VALUES (%s, %s, NOW(), %s, %s, %s)
    """
    g.cur.execute(query, (g.uuid, alpha, start_time, token, lexicon))

    return jsonify({'token': token})

  except Exception as e:
    app.logger.error(f"Error starting game: {e}")
    g.con.rollback()
    return jsonify({"error": "Internal server error"}), 500

@app.route('/slothAbortActive', methods=['POST'])
def abort_game():
  """
  ABORT_ACTIVE - Cancel/delete an active game session.
  Expects JSON: {'token': 'game_token_string'}
  """
  try:
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({'error': 'Missing game token'}), 400

    # Delete the active session for THIS user and THIS token
    # This ensures users can only abort their own games.
    query = """
        DELETE FROM sloth_active
        WHERE userid = %s AND token = %s
    """
    g.cur.execute(query, (g.uuid, token))

    # Check if a row was actually deleted
    if g.cur.rowcount == 0:
      # This could mean the token was invalid or the game already ended
      app.logger.warning(f"No active game found for user {g.uuid} with token {token}")
      # You might still return success, or a specific message
      return jsonify({'status': 'no_active_game_found'}), 200

    return jsonify({'status': 'game_aborted'})

  except Exception as e:
    app.logger.error(f"Error aborting game: {e}")
    g.con.rollback()
    return jsonify({'error': 'Internal server error'}), 500

def getAlphaRankings(alpha, lexicon):
  try:
    # Get the game results
    query = """
    SELECT userid, time_taken, correct, accuracy, date
    FROM sloth_completed
    WHERE alphagram = %s AND lex = %s
    ORDER BY correct DESC, accuracy DESC, time_taken ASC LIMIT 5
    """

    g.cur.execute(query, (alpha, lexicon))
    rows = g.cur.fetchall()

    # Extract unique user IDs for batch lookup
    user_ids = list({row['userid'] for row in rows})

    user_attributes = getUserAttributes(user_ids)
    user_info = {user["userid"]: user for user in user_attributes}
    # Build rankings with merged data
    rankings = []
    for rank, row in enumerate(rows, 1):
      user_data = user_info.get(row['userid'], {})
      ranking = {
        'rank': rank,
        'name': user_data.get('name', 'Unknown User'),
        'photo': user_data.get('photo'),
        'countryId': None,  # Explicitly null for now
        'time': row['time_taken'],
        'correct': row['correct'],
        'accuracy': row['accuracy'],
        'date': row['date']
      }
      if g.userid == row['userid']:
        ranking['isMe'] = True
      rankings.append(ranking)

    return rankings
  except Exception as e:
    xu.debug(f'Error in getAlphaRankings for {alpha}: {e}')
    raise e

def getUserAttributes(user_list):
  try:
    response = requests.post('http://login:5000/getUserNamesAndPhotos',
                   headers=g.headers,
                   json={'userList': user_list},
                   timeout=10)
    if response.status_code == 200:
      return response.json()
    return { }
  except requests.exceptions.RequestException as e:
    xu.debug(f'Error fetching user data: {e}')
    return { }
