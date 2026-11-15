'''Xerafin lexicon module'''

import os
import urllib
import json
import random
import re
import requests
from logging.config import dictConfig
from functools import lru_cache
import jwt # pylint: disable=E0401
import itertools
import dawg
from pymongo import MongoClient # pylint: disable=E0401
from pymongo.errors import PyMongoError
from flask import jsonify, request, g, abort # pylint: disable=E0401
from werkzeug.exceptions import HTTPException
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

ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
BLANK_KEY = re.compile(r'^([A-Z]+)\?$')
PLAIN_KEY = re.compile(r'^[A-Z]+$')
MAX_BLANK_CORE_LENGTH = 14   # answer length of 15 is the longest word we hold
MAX_BLANK_ANSWERS = 100      # CSW24 tops out around 116, so more is nonsense
MAX_BLANK_QUANTITY = 500

class InvalidRequest(ValueError):
  '''Raised when a caller supplies an invalid parameter.'''

class InvalidAlphagram(InvalidRequest):
  '''Raised when a caller supplies a non-canonical question key.'''

def int_param(params, name, fallback=None):
  '''Read an integer request parameter, rejecting missing or non-integer values.'''
  if name not in params:
    if fallback is None:
      raise InvalidRequest(f'missing required parameter {name}')
    return fallback
  value = params[name]
  if isinstance(value, bool) or not isinstance(value, int):
    raise InvalidRequest(f'{name} must be an integer')
  return value

def parse_alpha_key(key):
  '''Validate a question key and split it into (is_blank, core).

     Canonical keys are uppercase, sorted, with at most one trailing '?'.
     Blank keys ("AAIINR?") carry a single wildcard; answers from the 26
     possible substitutions are the union over all letters.
  '''
  if not isinstance(key, str) or not key:
    raise InvalidAlphagram('alphagram must be a non-empty string')
  if '?' in key:
    match = BLANK_KEY.match(key)
    if match is None:
      raise InvalidAlphagram(
        f'invalid blank alphagram {key!r}: expected uppercase letters followed by a single "?"')
    core = match.group(1)
    if len(core) > MAX_BLANK_CORE_LENGTH:
      raise InvalidAlphagram(
        f'blank alphagram {key!r} is longer than {MAX_BLANK_CORE_LENGTH + 1} characters')
    if core != ''.join(sorted(core)):
      raise InvalidAlphagram(
        f'blank alphagram {key!r} is not canonical: fixed letters must be sorted')
    return True, core
  if PLAIN_KEY.match(key) is None:
    raise InvalidAlphagram(f'invalid alphagram {key!r}: expected uppercase letters')
  if key != ''.join(sorted(key)):
    raise InvalidAlphagram(f'alphagram {key!r} is not canonical: letters must be sorted')
  return False, key

def blank_expansions(core):
  '''Return the 26 concrete alphagrams a blank core can expand to.'''
  return [''.join(sorted(core + letter)) for letter in ALPHABET]

@lru_cache(maxsize=4)
def load_dawg(filename):
  '''Load an alphagram DAWG, cached per path.

     Cached because /returnValidAlphas and /getSlothData used to reload the
     file on every request. A new dictionary file needs a fresh lexicon
     process (or a new path) to be picked up.
  '''
  return dawg.CompletionDAWG().load(filename)

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

    # headers to send to other services
    g.headers = {"Accept": "application/json", "Authorization": raw_token}

    mongo_db_name = os.environ.get('MONGO_INITDB_DATABASE')
    g.client = MongoClient(f'mongodb://lexicon-db:27017/')
    g.words = g.client[mongo_db_name]['words']
    g.dawg_filename = '/app/data/csw24.dawg'

    return None

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

@app.teardown_request
def closeMongo(exception=None):
  client = g.pop('client', None) # Safely get and remove from g
  if client is not None:
    try:
      client.close()
    except Exception as e:
      app.logger.error(f"Error closing MongoDB connection: {str(e)}")

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

     A trailing '?' is a wildcard: its answers are the union over every letter
     substituted for the blank, so "AAIINR?" -> ANTIAIR (blank = T) and
     DIARIAN (blank = D). Plain keys behave as before.
  '''
  params = request.get_json(force=True, silent=True)
  if not isinstance(params, dict):
    return jsonify({'error': 'request body must be a JSON object'}), 400
  alphas = params.get('alphagrams')
  if not isinstance(alphas, list) or not alphas:
    return jsonify({'error': 'alphagrams must be a non-empty list'}), 400

  keys = [ ]
  seen = set()
  wanted = { }  # concrete alphagram -> input keys that asked for it
  try:
    for key in alphas:
      is_blank, core = parse_alpha_key(key)
      if key in seen:
        continue
      seen.add(key)
      keys.append(key)
      expansions = blank_expansions(core) if is_blank else [key]
      for alpha in expansions:
        wanted.setdefault(alpha, [ ]).append(key)
  except InvalidRequest as e:
    return jsonify({'error': str(e)}), 400

  result = {key: [ ] for key in keys}
  query = {'alphagram': {'$in': list(wanted)}}
  for doc in g.words.find(query, {'alphagram': 1, 'word': 1}):
    for key in wanted.get(doc['alphagram'], ()):
      result[key].append(doc['word'])

  # A blank spans up to 26 alphagrams, so its answer order is not implicit
  for key in keys:
    if '?' in key:
      result[key].sort()

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
  if result is None:
    # Word not found - return a structured response
    return jsonify({
      'word': word,
      'definition': None,
      'front_hooks': '',
      'back_hooks': '',
      'found': False,
      'message': f"Word '{word}' not found in dictionary"
    })

  del result['_id']
  result['found'] = True
  return jsonify(result)

@app.route("/getWordsInfo", methods=['POST'])
def getWordsInfo():
  '''
  A batch version of getWordInfo.
  Returns a dict {"word": { word info from DB } }
  '''
  params = request.get_json(force=True)
  words = params.get('words', [ ])
  if not words:
    return jsonify({})
  try:
    query = {'word': {'$in': words}}
    # Create dictionary with word as a key
    # | operator uses second dict if keys overlap
    result = {word: {} for word in words} | {
         doc['word']: {k: v for k, v in doc.items() if k != '_id'}
         for doc in g.words.find(query)
         }
    return jsonify(result)
  except PyMongoError as e:
    app.logger.error(f"MongoDB error for words {words[:10]}...: {str(e)}")
    return jsonify({word: {} for word in words})
  except Exceptions as e:
    app.logger.error(f"Unexpected error in getWordsInfo for words {words[:10]}...: {str(e)}")
    return jsonify({word: {} for word in words})

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

@app.route("/getDotsBatch", methods=['POST'])
def getDotsBatch():
  params = request.get_json(force=True)
  words = params.get('words', [])

  if not words:
    return jsonify({})

  try:
    front_variations = [word[1:] for word in words]
    back_variations = [word[:-1] for word in words]
    # Get all valid subhooks for all words
    query = {'word': {'$in': front_variations + back_variations}}
    cursor = g.words.find(query, {'word': 1})
    existing_words = {doc['word'] for doc in cursor}

    result = { }
    for word in words:
      has_front = word[1:] in existing_words
      has_back = word[:-1] in existing_words
      result[word] = [has_front, has_back]

    return jsonify(result)
  except PyMongoError as e:
    app.logger.error(f"MongoDB error for words {words[:10]}...: {str(e)}")
    return jsonify({word: [False, False] for word in words})
  except Exceptions as e:
    app.logger.error(f"Unexpected error in getWordsInfo for words {words[:10]}...: {str(e)}")
    return jsonify({word: [False, False] for word in words})

@app.route('/returnValidAlphas', methods=['POST'])
def returnValidAlphas():
  ''' Takes in a list of alphagrams. Returns a list of alphagrams which have
        valid solutions in the dictionary. '''
  params = request.get_json(force=True)
  alphaList = params.get('alphas', [ ])

  # Load DAWG (cached for the life of the process)
  d = load_dawg(g.dawg_filename)

  # Find valid subanagrams
  result = list(filter(d.__contains__, alphaList))

  return jsonify(result)

@app.route("/wordJudge", methods=['POST'])
def wordJudge():
  '''
  Checks if all words in the provided list exist in the MongoDB database.
  Returns {"result": True} if all words exist, {"result": False} otherwise.
  '''
  params = request.get_json(force=True)
  words = params.get('words', [])

  # Handle empty list case
  if not words:
    return jsonify({"result": False})

  try:
    # Remove duplicates for efficiency (optional)
    unique_words = list(set(words))

    # Query to find all existing words
    query = {'word': {'$in': unique_words}}

    # Get count of matching documents
    existing_count = g.words.count_documents(query)

    # Check if all unique words exist
    all_exist = (existing_count == len(unique_words))

    return jsonify({"result": all_exist})

  except PyMongoError as e:
    app.logger.error(f"MongoDB error in wordJudge for words {words[:10]}...: {str(e)}")
    return jsonify({"error": "Service temporarily unavailable"}), 503
  except Exception as e:
    app.logger.error(f"Unexpected error in wordJudge for words {words[:10]}...: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500

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

@app.route('/getRandomBlankAlphas', methods=['POST'])
def getRandomBlankAlphas():
  '''Return canonical blank alphagrams ("AAIINR?") for blank quizzes.

     Request: {quantity, length, minAnswers=1, maxAnswers=10}
       length     - answer length, i.e. the length of the returned keys
       minAnswers - inclusive lower bound on distinct answers
       maxAnswers - inclusive upper bound on distinct answers

     Sampling starts from a real word of the requested length and drops one
     letter, so every candidate has at least one answer and cores that are not
     themselves alphagrams are reachable. Rejection sampling is bounded: if the
     constraints cannot be met the request is rejected rather than answered
     with fewer keys than asked for.
  '''
  params = request.get_json(force=True, silent=True)
  if not isinstance(params, dict):
    return jsonify({'error': 'request body must be a JSON object'}), 400
  try:
    quantity = int_param(params, 'quantity')
    length = int_param(params, 'length')
    min_answers = int_param(params, 'minAnswers', 1)
    max_answers = int_param(params, 'maxAnswers', 10)
  except InvalidRequest as e:
    return jsonify({'error': str(e)}), 400

  if quantity < 1 or quantity > MAX_BLANK_QUANTITY:
    return jsonify({'error': f'quantity must be between 1 and {MAX_BLANK_QUANTITY}'}), 400
  if length < 2 or length > MAX_BLANK_CORE_LENGTH + 1:
    return jsonify({'error': f'length must be between 2 and {MAX_BLANK_CORE_LENGTH + 1}'}), 400
  if min_answers < 1 or max_answers < min_answers:
    return jsonify({'error': 'minAnswers must be at least 1 and no greater than maxAnswers'}), 400
  if min_answers > MAX_BLANK_ANSWERS:
    return jsonify({'error': f'minAnswers may not exceed {MAX_BLANK_ANSWERS}'}), 400

  accepted, sampled = generate_blank_alphas(quantity, length, min_answers, max_answers)
  if len(accepted) < quantity:
    app.logger.warning(
      'getRandomBlankAlphas found %s of %s keys in %s samples (length %s, answers %s-%s)',
      len(accepted), quantity, sampled, length, min_answers, max_answers)
    return jsonify({
      'error': f'found only {len(accepted)} of {quantity} blank alphagrams within '
               f'{sampled} samples (length {length}, answers {min_answers}-{max_answers})'
    }), 400

  return jsonify(accepted)

def sample_words(length, quantity):
  '''Return up to quantity random words of the given length.'''
  cursor = g.words.aggregate([
    {'$match': {'$expr': {'$eq': [{'$strLenCP': '$word'}, length]}}},
    {'$sample': {'size': quantity} }
  ])
  return [doc['word'] for doc in cursor]

def core_from_word(word):
  '''Turn a word into a blank core by dropping one random distinct letter.'''
  letter = random.choice(sorted(set(word)))
  return ''.join(sorted(word.replace(letter, '', 1)))

def count_blank_answers(cores):
  '''Map each blank core to the number of distinct words across its expansions.'''
  expansions = { }  # concrete alphagram -> cores that expand to it
  for core in cores:
    for alpha in blank_expansions(core):
      expansions.setdefault(alpha, [ ]).append(core)

  counts = {core: 0 for core in cores}
  query = {'alphagram': {'$in': list(expansions)}}
  for doc in g.words.find(query, {'alphagram': 1}):
    for core in expansions.get(doc['alphagram'], ()):
      counts[core] += 1
  return counts

def generate_blank_alphas(quantity, length, min_answers, max_answers):
  '''Rejection-sample blank keys whose answer count is within bounds.

     Returns (keys, sampled). Measured hit rates are 72.5% for length 7 and
     85.9% for length 8, so the budget is generous; half the candidates are
     drawn per round to keep the number of Mongo round trips at one or two.
  '''
  budget = max(quantity * 10, 200)  # candidate words, not accepted keys
  batch = min(max(quantity * 2, 100), 500)  # bounds the $in size per round
  accepted = [ ]
  seen = set()
  sampled = 0

  while len(accepted) < quantity and sampled < budget:
    size = min(batch, budget - sampled)
    words = sample_words(length, size)
    sampled += size
    if not words:
      break

    candidates = [ ]
    for word in words:
      core = core_from_word(word)
      if core in seen:
        continue
      seen.add(core)
      candidates.append(core)

    if not candidates:
      continue

    counts = count_blank_answers(candidates)
    for core in candidates:
      if min_answers <= counts.get(core, 0) <= max_answers:
        accepted.append(core + '?')
        if len(accepted) == quantity:
          break

  return accepted, sampled

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
          "auxInfo": aux_info.get('aux', { })
        })

        total_lengths += 1

      # Stop if we have enough data
      if total_lengths >= 4 and total_words > REASONABLE_QUIZ_SIZE:
        break

    return jsonify({
      "result": result,
      "error": {"status": "success"}
      })

  except HTTPException:
    raise
  except Exception as e:
    # Log the error
    app.logger.error(f"Error in get_sloth_data: {e}")
    return jsonify({
        "result": [],
        "error": {"status": f"Error: {str(e)}"}
    }), 500

def getSubanagrams(alpha):
  ''' Take in an alphagram and return valid subanagrams '''

  # Load DAWG (cached for the life of the process)
  d = load_dawg(g.dawg_filename)

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
        elif response.status_code == 401:
            abort(401, description=response.text)
        else:
            app.logger.error(f"Cardbox service returned error: {response.status_code}")
            return {}

    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error calling cardbox service: {e}")
        return {}
