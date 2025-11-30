'''Xerafin lexicon module'''

import os
import urllib
import json
import requests
from logging.config import dictConfig
from functools import lru_cache
import jwt # pylint: disable=E0401
import itertools
import dawg
from pymongo import MongoClient # pylint: disable=E0401
from flask import jsonify, request, g # pylint: disable=E0401
import xerafinUtil.xerafinUtil as xu
from lexicon import app

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

  mongo_user = os.environ.get('MONGO_INITDB_ROOT_USERNAME')
  mongo_pass = os.environ.get('MONGO_INITDB_ROOT_PASSWORD')
  mongo_db_name = os.environ.get('MONGO_INITDB_DATABASE')
  g.client = MongoClient(f'mongodb://{mongo_user}:{mongo_pass}@lexicon-db:27017/')
  g.words = g.client[mongo_db_name]['words']
  g.dawg_filename = '/data/csw24.dawg'

  return None

@app.after_request
def closeMongo(response):
  g.client.close()
  return response

@app.route("/", methods=['GET', 'POST'])
def default():
  return "Xerafin Lexicon Service"

# Each word in mongodb is a document with the following structure:
#   front_hooks
#   word
#   back_hooks
#   alphagram
#   definition
# Documents come back as a cursor of python dicts

@app.route("/getAlphagramCounts", methods=['GET'])
def getAlphagramCounts():
  ''' need to rewrite this using mongodb '''
  result = { }
#    stmt = "select length(alphagram), count(distinct alphagram)
#             from words group by length(alphagram)"
#    g.con.execute(stmt)
#    result = dict([(row[0], row[1]) for row in g.con.fetchall()])
  return jsonify(result)

@app.route("/getAnagrams", methods=['GET', 'POST'])
def getAnagramsView():
  params = request.get_json(force=True)
  alpha = params.get('alpha')
  return jsonify(getAnagrams(alpha))

def getAnagrams(alpha):
  '''Take in one alphagram and return the valid words associated.'''
  # Someday may want to implement this with the DAWG
  query = {"alphagram": alpha}
  result = g.words.find(query)
  return [x["word"] for x in result]

@app.route("/getManyAnagrams", methods=['GET', 'POST'])
def getManyAnagrams():
  '''Take in a list of alphagrams and return a dict
       { alpha: [ word word word ], ... }
  '''
  params = request.get_json(force=True)
  alphas = params.get('alphagrams')
  result = { }
  for alpha in alphas:
    query = {"alphagram": alpha}
    words = g.words.find(query)
    result[alpha] = [x["word"] for x in words]
  return jsonify(result)


@app.route("/getWordInfo", methods=['GET', 'POST'])
def getWordInfo() :
  '''
  Takes in a word
  Returns a dict representing that word document in the DB
  '''
  params = request.get_json(force=True)
  word = params.get('word')
  query = {'word': word}
  result = g.words.find_one(query)
  del result['_id']
  return jsonify(result)

@app.route("/getDots",  methods=['GET', 'POST'])
def getDots():
  '''
  takes in a word, returns a list of two booleans
  does the word lose the front / back letter and still make a word?
  '''
  params = request.get_json(force=True)
  word = params.get('word')
  numFront = g.words.count_documents({'word': word[1:]})
  numBack = g.words.count_documents({'word': word[:-1]})
  return jsonify([numFront > 0, numBack > 0])

@app.route('/returnValidAlphas', methods=['POST'])
def returnValidAlphas():
  ''' Takes in a list of alphagrams. Returns a list of alphagrams which have
        valid solutions in the dictionary. '''
  params = request.get_json(force=True)
  alphaList = params.get('alphas', [ ])

  # Load DAWG
  d = dawg.CompletionDAWG().load(g.dawg_filename)

  # Find valid subanagrams
  result = list(filter(d.__contains__, alphaList))

  return jsonify(result)

@app.route('/getRandomAlphas', methods=['GET', 'POST'])
def getRandomAlphas():
  ''' Take in a list of lengths and a quantity. Return a list of alphagrams '''
  params = request.get_json(force=True)
  lengths = params.get('lengths', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  quantity = params.get('quantity', 1)
  cursor = g.words.aggregate([
                     {"$group": { "_id": "$alphagram" } },
                     {"$match": {"$expr": {"$in": [{"$strLenCP": "$_id"}, lengths]
                     }}},
                     {"$sample": {"size": quantity} }
             ] )
  response = [ x['_id'] for x in cursor ]
  return jsonify(response)

@app.route('/getSlothData', methods=['POST'])
def get_sloth_data():
  """
  Get subanagram data for Subword Sloth game
  Returns words grouped by length with auxiliary info
  """
  try:
    params = request.get_json()
    alpha = params.get("alpha")

    if not alpha:
      return jsonify({"error": "Missing alphagram parameter"}), 400

    # Use authenticated user from JWT
    userid = g.uuid

    # Configuration
    REASONABLE_QUIZ_SIZE = 25
    pruneWords = True  # params.get("getAllWords") == "1" - simplified for now

    result = []
    total_words = 0
    total_lengths = 0
    max_length = len(alpha)
    # Get all subanagrams for the input alphagram
    subalphas = getSubanagrams(alpha)
    auxInfoBatch = getAuxInfoBatch(subalphas)

    # Process by length (longest first)
    for length in range(max_length, 1, -1):
      length_sublist = [x for x in subalphas if len(x) == length]

      if not length_sublist:
        continue

      # Process each alphagram of this length
      for subalpha in length_sublist:
        words = getAnagrams(subalpha)
        aux_info = auxInfoBatch.get(subalpha, { })

        total_words += len(words)
        result.append({
          "alpha": subalpha,
          "words": words,
          "auxInfo": aux_info
        })

        total_lengths += 1

      # Stop if we have enough data
      if total_lengths >= 4 and total_words > REASONABLE_QUIZ_SIZE:
        break

    return jsonify({
      "result": result,
      "error": {"status": "success"}
      })

  except Exception as e:
    # Log the error
    xu.debug(f"Error in get_sloth_data: {e}")
    return jsonify({
        "result": [],
        "error": {"status": f"Error: {str(e)}"}
    }), 500

def getSubanagrams(alpha):
  ''' Take in an alphagram and return valid subanagrams '''

  # Load DAWG
  d = dawg.CompletionDAWG().load(g.dawg_filename)
  xu.debug(powerset(alpha))

  # Find valid subanagrams
  result = list(filter(d.__contains__, powerset(alpha)))

  # Sort by length (longest first) then alphabetically
  result.sort(key=lambda x: (-len(x), x))

  return result

def powerset(alphagram):
  ''' Return the powerset of an alphagram,
       unique entries of length 2 or more only '''
  return {
    ''.join(combo)
    for r in range(2, len(alphagram) + 1)
    for combo in itertools.combinations(alphagram, r)
  }

def getAuxInfoBatch(alphalist):
    """
    Get auxiliary info for alphagrams from the cardbox service
    """
    try:
        response = requests.post(
            'http://cardbox:5000/getAuxInfoBatch',
            json={'alphalist': alphalist},
            headers=g.headers,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            return data
        else:
            xu.debug(f"Cardbox service returned error: {response.status_code}")
            return {}

    except requests.exceptions.RequestException as e:
        xu.debug(f"Error calling cardbox service: {e}")
        return {}
