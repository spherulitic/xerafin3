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
    g.countryId = auth_token.get('cardboxPrefs', {}).get('countryId', 0)
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
    app.logger.error(f'Error getting sloth rankings for {alpha}: {e}', exc_info=True)
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
    app.logger.error(f"Error getting sloth stats: {e}", exc_info=True)
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
    app.logger.error(f"Error starting game: {e}", exc_info=True)
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
    app.logger.error(f"Error aborting game: {e}", exc_info=True)
    g.con.rollback()
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/slothComplete', methods=['POST'])
def complete_game():
  """
  WRITE_COMPLETED - Save completed game results and notify chat.
  Expects JSON: {
    'token': 'game_token_string',
    'correct': 95,
    'accuracy': 98.5,
  }
  """
  try:
    data = request.get_json()
    token = data.get('token')
    correct = data.get('correct')
    accuracy = data.get('accuracy')

    # Validate required fields
    if not all([token, correct, accuracy]):
      return jsonify({'error': 'Missing required fields'}), 400

    # First, get the active game to verify it exists and get details
    get_active_query = """
      SELECT userid, alphagram, lex, start_time
      FROM sloth_active
      WHERE token = %s AND userid = %s
    """
    g.cur.execute(get_active_query, (token, g.uuid))
    active_game = g.cur.fetchone()

    if not active_game:
      return jsonify({'error': 'Active game not found or unauthorized'}), 404

    # Calculate time taken
    time_taken = time.time() - active_game['start_time']

    # 1. Insert into completed games
    insert_completed_query = """
      INSERT INTO sloth_completed
      (userid, alphagram, lex, time_taken, correct, accuracy, date, token)
      VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
    """
    g.cur.execute(insert_completed_query, (
      g.uuid,
      active_game['alphagram'],
      active_game['lex'],
      time_taken,
      correct,
      accuracy,
      token
    ))

    # 2. Delete from active games
    delete_active_query = """
      DELETE FROM sloth_active
      WHERE token = %s AND userid = %s
    """
    g.cur.execute(delete_active_query, (token, g.uuid))

    # 3. Submit to chat if it's a record (correct >= 100)
    chat_sent = False
    if correct >= 50 and isTopScore(token, active_game['alphagram'], active_game['lex']):
      try:
        # Get user info for chat message
        user_info = getUserAttributes([g.uuid])
        username = user_info[0].get('name', 'A player')

        # Build chat message
        if correct >= 100 and accuracy >= 100:
          message = f"{username} has set a new record in Subword Sloth for {active_game['alphagram']} with a perfect score! <a href='#' onclick='initSloth(\"{active_game['alphagram']}\",\"{active_game['lex']}\")'>Click here</a> to try it yourself!"
        else:
          message = f"{username} has set a new record in Subword Sloth for {active_game['alphagram']}. <a href='#' onclick='initSloth(\"{active_game['alphagram']}\",\"{active_game['lex']}\")'>Click here</a> to try it yourself!"

        # Call chat service
        chat_response = requests.post(
          'http://chat:5000/submitChat',
          headers=g.headers,
          json={
              'userid': '0',  # System user or bot ID
              'chatText': message
          },
          timeout=5
        )
        chat_sent = chat_response.status_code == 200

      except Exception as chat_error:
        app.logger.error(f"Chat notification failed: {chat_error}", exc_info=True)
        # Don't fail the whole request if chat fails

    g.con.commit()

    return jsonify({
      'status': 'game_completed',
      'chat_sent': chat_sent,
      'time_taken': time_taken
    })

  except Exception as e:
    app.logger.error(f"Error completing game: {e}")
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
        'countryId': g.countryId,
        'time': row['time_taken'],
        'correct': row['correct'],
        'accuracy': row['accuracy'],
        'date': row['date']
      }
      if g.uuid == row['userid']:
        ranking['isMe'] = True
      rankings.append(ranking)

    return rankings
  except Exception as e:
    app.logger.error(f'Error in getAlphaRankings for {alpha}', exc_info=True)
    raise e

def isTopScore(token, alphagram, lexicon):
  """
  Check if the completed game with this token is rank #1 for its alphagram.
  Uses the same ranking logic as get_rank() but compares tokens.
  """
  query = """
    SELECT token
    FROM sloth_completed
    WHERE alphagram = %s AND lex = %s
    ORDER BY correct DESC, accuracy DESC, time_taken ASC, date DESC
    LIMIT 1
  """

  g.cur.execute(query, (alphagram, lexicon))
  top_score = g.cur.fetchone()

  # If our token is at the top of the sorted results, we're rank #1
  return top_score and top_score['token'] == token

def getUserAttributes(user_list):
  '''
     Returns a list of dictionaries
     [ {"userid": uuid, "name": name, "photo": photo}, { .... } ]
  '''
  try:
    response = requests.post('http://login:5000/getUserNamesAndPhotos',
                   headers=g.headers,
                   json={'userList': user_list},
                   timeout=10)
    if response.status_code == 200:
      return response.json()
    return { }
  except requests.exceptions.RequestException as e:
    app.logger.error(f'Error fetching user data: {e}')
    return { }
