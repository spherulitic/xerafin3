from math import ceil
from logging.config import dictConfig
from datetime import datetime, timedelta
import json
import urllib
import jwt
from flask import request, jsonify, g
from dateutil.relativedelta import relativedelta, MO
import xerafinUtil.xerafinUtil as xs
from stats import app

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]
PERIODS = ["daily","weekly","monthly","yearly"] + DAYS + MONTHS
RANKING_PERIODS = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth", "thisYear", "lastYear", "eternity"]

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
  # for now until all the classes are implemented
  rank = None
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
        rank = Metaranks(data)
      else:
        rank = Rankings(data)
    elif data.get("view", "QA") == "AW":
      rank = Awards(data)
    elif data.get("view", "QA") == "SL":
  #    rank = SlothRankings(data)
      pass
    else:
      rank = Rankings(data)

  except:
    xs.errorLog()

  if rank:
    return jsonify(rank.getRankings())
  return jsonify(["Dummy response"])

@app.route("/getAllTimeStats", methods=['GET', 'POST'])
def getAllTimeStats():

  result = { }
  error = { }

  try:
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

  except:
    xs.errorLog()
    error["status"] = "An error occurred. See log for more details"

  response = jsonify(result)
  return response

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
    g.con.execute(self.query)
    return g.con.fetchall()

  def findUser(self, findCurrent=True):
    self.query = f""" SELECT userid, SUM(questionsAnswered) AS total {self.setDateType()},
                        name, firstname, lastname
                       FROM leaderboard
                       JOIN login USING (userid)
                       JOIN user_prefs USING (userid)
                       {self.checkWhere()}{self.setDay()}{self.setMonth()}
                       GROUP BY userid{self.getTimeConditionsQuery()}, name, firstname, lastname
                       ORDER BY total DESC, date ASC, firstname ASC, lastname ASC """
    # columns in result set: [userid, questionsAnswered, date, name, firstname, lastname]
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
    queryStart = f"""SELECT name, photo, countryId,
               SUM(questionsAnswered) AS total{self.setDateType()},
               userid, firstname, lastname
               FROM leaderboard
               JOIN login USING (userid)
               JOIN user_prefs USING (userid) """
    self.query = f"""{queryStart}{self.checkWhere()}{self.setDay()}{self.setMonth()}
               GROUP BY userid, name{self.getTimeConditionsQuery()}, photo,
               firstname, lastname, countryId
               ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
               LIMIT {self.offset},{self.pageSize} """
    result = self.runQuery()
    rank = self.offset
    self.rankData = [ ]
    foundMe = False
    foundCurrent = False
    for row in result:
      rank += 1
      rowDict = { "name": row[0], "photo": row[1], "countryId": row[2],
                  "total": row[3], "date": row[4], "userid": row[5],
                  "firstname": row[6], "lastname": row[7] }
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
              GROUP BY userid, name{self.getTimeConditionsQuery()}, photo,
               firstname, lastname, countryId
              ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
              LIMIT 1"""
      result = self.runQuery()
      for row in result:
        rowDict = { "name": row[0], "photo": row[1], "countryId": row[2],
                    "total": row[3], "date": row[4], "userid": row[5],
                    "firstname": row[6], "lastname": row[7] }
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
                GROUP BY userid, name{self.getTimeConditionsQuery()}, photo
                         firstname, lastname, countryId
                ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
                LIMIT 1 """
      result = self.runQuery()
      for row in result:
        rowDict = { "name": row[0], "photo": row[1], "countryId": row[2],
                    "total": row[3], "date": row[4], "userid": row[5],
                    "firstname": row[6], "lastname": row[7] }
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
    userData = { }
    for row in self.rankData:
      if len(row["firstname"]) == 0:
        name = row["name"]
      else:
        name = f"{row['firstname']} {row['lastname']}"
      userData = { }
      userData["users"] = [ {'photo': row["photo"], 'name': name, 'answered': row["total"]} ]
      userData["rank"] = row['rank']
      userData["countryId"] = row['countryId']
      userData["date"] = self.formatDate(row["date"])
      if 'isMe' in row:
        userData["isMe"] = row["isMe"]
      if 'isCurrent' in row:
        userData["isCurrent"] = row["isCurrent"]
      rankingsList.append(userData)
    result = { "rankings": userData, "myRank": self.userRank, "myCurrent": self.currentRank,
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
    data = [{'photo':p_row['photo'], 'name':p_row['name']}]
    outp = {'rank':p_row['rank'], 'users':data, 'countryId':p_row['countryId'], 'values':p_row['values']}
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
    self.query = f'''SELECT name, photo, countryId, SUM(questionsAnswered) AS total, userid, firstname, lastname
                     FROM leaderboard
                     JOIN login USING (userid)
                     JOIN user_prefs USING (userid)
                     {self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}
                     GROUP BY userid, name, photo, firstname, lastname, countryId
                     ORDER BY total DESC, firstname ASC, lastname ASC'''
    result = self.runQuery()
    myIndex = [i for (i,j) in enumerate(result) if j[4] == g.uuid]
    # at this point, myIndex is [<index>] where it's the index of the row matching my uuid in the result set
    # if no match, myIndex is an empty list which is falsy
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
    self.query = f'SELECT COUNT(DISTINCT userid) AS users FROM leaderboard{self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}'
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
    """Process rankings data from the database"""
    queryStart = '''SELECT name, photo, countryId, SUM(questionsAnswered) AS total, userid, firstname, lastname
                    FROM leaderboard
                    JOIN login USING (userid)
                    JOIN user_prefs USING (userid)'''
    self.query = f'''{queryStart}{self.checkEtern("WHERE")}{self.getTimeConditionsQuery()}
                    GROUP BY userid, name, photo, firstname, lastname, countryId
                    ORDER BY total DESC, firstname ASC
                    LIMIT {self.offset},{self.pageSize}'''
    result = self.runQuery()
    self.rankData = [ ]
    foundMe = False
    for index, row in enumerate(result):
      rowDict = {"name": row[0], "photo": row[1], "countryId": row[2], "total": row[3],
                 "userid": row[4], "firstname": row[5], "lastname": row[6]}
      if rowDict["userid"] == g.uuid:
        rowDict['isMe'] = True
        foundMe = True
      rowDict['rank'] = self.offset + index + 1
      self.rankData.append(rowDict)
    if not foundMe:
      self.query = f'''{queryStart} WHERE userid='{g.uuid}'{self.checkEtern('AND')}{self.getTimeConditionsQuery()}
                    GROUP BY userid, name, photo, firstname, lastname, countryId
                    ORDER BY total DESC, firstname ASC, lastname ASC
                    LIMIT 1'''
      result = self.runQuery()
      # I think no rows returned gets me an empty list
      if result:
        row = result[0]
        rowDict = {"name": row[0], "photo": row[1], "countryId": row[2], "total": row[3],
                 "userid": row[4], "firstname": row[5], "lastname": row[6]}
        rowDict['isMe'] = True
        if self.userRank:
          rowDict['rank'] = self.userRank
        if rowDict['rank'] < self.rankData[0]['rank']:
          self.rankData.insert(0, rowDict)
        else:
          self.rankData.append(rowDict)

  def getRankings(self):
    """Format the data structures to output to the client"""
    rankings = [ ]
    for row in self.rankData:
      if row['firstname']:
        displayName = f'{row["firstname"]} {row["lastname"]}'
      else:
        displayName = row['name']
      rowOut = {'users': [{'photo': row['photo'], 'name': displayName, 'answered': row['total']}],
           'rank': row['rank'], 'countryId': row['countryId']}
      if 'isMe' in row:
        rowOut['isMe'] = row['isMe']
      rankings.append(rowOut)
    result = {'rankings': rankings, 'myRank': self.userRank, 'period': self.period, 'users': self.userCount, 'page': self.page+1}
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
#    $this->getRankingBounds();
#    $this->getRankingsData();

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
    xs.debug(self.query)
    g.con.execute(f'SET @datevalue = {self.curDate}')
    g.con.execute(self.query)
    return g.con.fetchall()

  def findUser(self):
    self.query = f'''SELECT name, photo, countryId, COUNT({self.getSlothSubSelect()} alphagram) AS total, userid, firstname, lastname
                   FROM sloth_completed
                   JOIN login USING (userid)
                   JOIN user_prefs USING (userid)
                   WHERE {this.getTimeConditionsQuery()} AND {this.getSlothSubFilter()}
                   GROUP BY userid, name, photo, firstname, lastname, countryId
                   ORDER BY total DESC, firstname ASC, lastname ASC'''
    result = self.runQuery()
    myIndex = [i for (i,j) in enumerate(result) if j[4] == g.uuid]
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

#
#  private function getRankingBounds(){
#    if ($this->displayType == 1){
#      $bound = $this->pageSize;
#      if ($bound % 2 == 0) {$this->pageSize++;}
#      if ($bound % 2 !== 0) {$bound--;}
#      $bounds = $bound/2;
#
#      $this->offset = $this->userRank - $bounds -1;
#      if ($this->offset < 0) {$this->offset = 0;}
#      if ($this->userRank + $bounds > $this -> userCount) {
#        $this->offset = $this->userCount - $this->pageSize;
#      }
#      if ($this->offset < 0) {$this->offset = 0;}
#      $this->pagetotal = 1;
#      $this->page = 1;
#    }
#    else {
#      $this->pageTotal = ceil($this->userCount / $this->pageSize);
#      if ($this->pageTotal===0){$this->pageTotal=1;}
#      $this->page = min(($this->pageNumber-1),($this->pageTotal));
#      $this->offset = $this->pageSize*($this->page);
#    }
#
#
#  }
#
#  private function getRankingsData(){
#    $queryStart = "SELECT name, photo, countryId, COUNT(".$this->getSlothSubSelect()."alphagram) AS total, userid, firstname, lastname FROM sloth_completed
#    JOIN login USING (userid)
#    JOIN user_prefs USING (userid)";
#    $this->query = $queryStart." WHERE ".$this->getTimeConditionsQuery()." AND ".$this->getSlothSubFilter()."
#    GROUP BY userid, name, photo, firstname, lastname, countryId
#    ORDER BY total DESC, firstname ASC, lastname ASC
#    LIMIT ".$this->offset.",".$this->pageSize;
#    $res = $this->runQuery();
#    $rank = $this->offset;
#    $this->rankData = [];
#    $foundMe = false;
#    while ($row = $res->fetch_assoc()){
#      $rank++;
#      if ($row['userid'] == $this->userid){
#        $row['isMe']=true;
#        $foundMe=true;
#      }
#      $row['rank']=$rank;
#      $this->rankData[] = $row;
#    }
#    if ($foundMe==false){
#      $this->query = $queryStart." WHERE "." userid=".$this->userid." AND ".$this->getSlothSubFilter()." AND ".$this->getTimeConditionsQuery()."
#      GROUP BY userid, name, photo, firstname, lastname, countryId
#      ORDER BY total DESC, firstname ASC, lastname ASC
#      LIMIT 1";
#      $res = $this->runQuery();
#      while ($row = $res->fetch_assoc()){
#        if ($row['userid'] == $this->userid){
#          $row['isMe']=true;
#          if ($this->userRank!==false){$row['rank']=$this->userRank;}
#          if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
#          else {$this->rankData[] = $row;}
#        }
#      }
#    }
#  }
#  public function getRankingsJSON(){
#    $b = [];
#    foreach ($this->rankData as $row) {
#      if (strlen($row['firstname'])==0){$d=$row['name'];}
#      else {$d=$row['firstname']." ".$row['lastname'];}
#      $c = array(
#        'users'=> array(
#          0 => array(
#            'photo'=>$row['photo'], 'name'=>$d, 'answered'=> $row['total']
#          )
#        ),
#        'rank'=> $row['rank'], 'countryId'=> $row['countryId']
#      );
#      if (isset($row['isMe'])){$c['isMe'] = $row['isMe'];}
#      $b[]= $c;
#    }
#    $a=array('rankings'=> $b, 'myRank'=> $this->userRank, 'period'=> $this->period, 'users' => $this->userCount, 'page' => $this->page+1 );
#    echo json_encode($a,true);
#  }
#
