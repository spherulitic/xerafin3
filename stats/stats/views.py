from math import ceil
from logging.config import dictConfig
from datetime import datetime, timedelta
import json
import urllib
import requests
import jwt
from flask import request, jsonify, g
from dateutil.relativedelta import relativedelta, MO
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

@app.before_request
def getUser():
  public_key_url = 'http://keycloak:8080/auth/realms/Xerafin'
  with urllib.request.urlopen(public_key_url) as r:
    public_key = json.loads(r.read())['public_key']
    public_key = f'''-----BEGIN PUBLIC KEY-----
{public_key}
-----END PUBLIC KEY-----'''
  raw_token = request.headers["Authorization"]
  g.auth_token = jwt.decode(raw_token, public_key, audience="x-client", algorithms=['RS256'])
  g.uuid = g.auth_token["sub"]
  g.photo = 'images/unknown_player.gif'
  g.name = g.auth_token["name"]
  g.countryId = g.auth_token.get('countryId', "")
  g.handle = g.auth_token["preferred_username"]
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
      xu.debug("creating Metaranks object")
      rank = Metaranks(data)
    else:
      xu.debug("creating Rankings object")
      rank = Rankings(data)
  elif data.get("view", "QA") == "AW":
    xu.debug("creating Awards object")
    rank = Awards(data)
  elif data.get("view", "QA") == "SL":
    xu.debug("creating Sloth Rankings object")
    rank = SlothRankings(data)
  else:
    xu.debug("creating Rankings object")
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
  else:
    g.con.execute(f'''select questionsAnswered, startScore from leaderboard
                    where userid = '{g.uuid}' and datestamp = curdate()''')
    row = g.con.fetchone()
    questionsAnswered = row[0]
    startScore = row[1]
  return jsonify({'questionsAnswered': questionsAnswered, 'startScore': startScore})

def getUserData(uuid):
  url = f'http://keycloak:8080/auth/admin/Xerafin/users/{uuid}'
  resp = requests.get(url, headers=g.headers).json()
  xu.debug(f"Getting user info from keycloak for {uuid}")
  xu.debug(str(resp))
  return resp

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

  def compareDateWithCurrent(self, d):
    dateIn = datetime.strptime(d, '%Y-%m-%d')
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
      return (x.date() == lastMonday.date()) and (dateIn.weekday() == now.weekday())
    elif self.period in MONTHS + ["monthly"]:
      return now.month == dateIn.month and now.year == dateIn.year
    elif self.period == "daily":
      return now.date() == dateIn.date()
    elif self.period == "weekly":
      return now.isocalendar().week == dateIn.isocalendar.week() and now.year == dateIn.year
    elif self.period == "yearly":
      return now.year == dateIn.year
    return False

  def formatDate(self, p_date):
    dateIn = datetime.strptime(p_date, '%Y-%m-%d')
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
               GROUP BY userid, {self.getTimeConditionsQuery()}, countryId
               ORDER BY total DESC, date ASC
               LIMIT {self.offset},{self.pageSize} """
    result = self.runQuery()
    rank = self.offset
    self.rankData = [ ]
    foundMe = False
    foundCurrent = False
    for row in result:
      rank += 1
      rowDict = { "total": row[0], "date": row[1], "userid": row[2]}
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
        keycloakData = getUserData(row["userid"])
        subData['photo'] = keycloakData.get('photo', 'images/unknown_player.gif')
        subData['name'] = keycloakData.get('name', 'Mystery User')
        userData['countryId'] = keycloakData.get('countryId')

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
      self.offset = min(self.userRank - bounds - 1, 0)
      if self.userRank + bounds > self.userCount:
        self.offset = min(self.userCount - self.pageSize, 0)
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
    xu.debug(f'Rankings object ran query {self.query}')
    xu.debug(str(result))
    self.rankData = [ ]
    foundMe = False
    for index, row in enumerate(result):
      rowDict = {"total": row[0], "userid": row[1]}
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
    xu.debug("Finished setting up rankData")
    xu.debug(str(self.rankData))

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
        keycloakData = getUserData(row["userid"])
        subData['photo'] = keycloakData.get('photo', 'images/unknown_player.gif')
        subData['name'] = keycloakData.get('name', 'Mystery User')
        userData['countryId'] = keycloakData.get('countryId')

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
    xu.debug(self.query)
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
    if self.displayType == 1:
      bound = self.pageSize
      if bound % 2 == 0:
        self.pageSize += 1
      if bound % 2 != 0:
        bound = bound - 1
      bounds = int(bound / 2)
      self.offset = min(self.userRank - bounds - 1, 0)
      if self.userRank + bounds > self.userCount:
        self.offset = min(self.userCount - self.pageSize, 0)
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
    self.query = f'''{queryStart} WHERE {self.getTimeConditionsQuery()} AND {self.getSlothSubFilter()}
                    GROUP BY userid
                    ORDER BY total DESC
                    LIMIT {self.offset},{self.pageSize}'''
    result = self.runQuery
    self.rankData = [ ]
    foundMe = False
    for index, row in enumerate(result):
      rowDict = {"total": row[0], "userid": row[1]}
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
        keycloakData = getUserData(row["userid"])
        subData['photo'] = keycloakData.get('photo', 'images/unknown_player.gif')
        subData['name'] = keycloakData.get('name', 'Mystery User')
        userData['countryId'] = keycloakData.get('countryId')

      userData['rank'] = row['rank']
      userData['users'] = [ subData ]

      rankingsList.append(userData)
    result = { "rankings": rankingsList, "myRank": self.userRank,
               "period": self.period, "users": self.userCount, "page": self.page+1}
    return result
