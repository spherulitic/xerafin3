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
#from .rankings import Rankings
#from .slothRankings import SlothRankings

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
MONTHS = ["january","february","march","april","may","june","july",
          "august","september","october","november","december"]
PERIODS = ["daily","weekly","monthly","yearly"] + DAYS + MONTHS

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
    found = False
    self.query = f""" SELECT userid, SUM(questionsAnswered) AS total {self.setDateType()},
                        name, firstname, lastname
                       FROM leaderboard
                       JOIN login USING (userid)
                       JOIN user_prefs USING (userid)
                       {self.checkWhere()}{self.setDay()}{self.setMonth()}
                       GROUP BY userid{self.getTimeConditionsQuery()}, name, firstname, lastname
                       ORDER BY total DESC, date ASC, firstname ASC, lastname ASC """
    result = self.runQuery()
    self.userRank = -1
    myrank = 0
    # TO DO: change this to use a dict cursor or better yet, ORM
    # columns in result set: [userid, questionsAnswered, date, name, firstname, lastname]
    for row in result:
      myrank += 1
      if g.uuid == row[0]:
        if not found:
          found = True
          self.userRank = myrank
        if findCurrent:
          if self.compareDateWithCurrent(row[2]):
            self.currentRank = myrank
            break
        else:
          if found:
            break

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

#      $this->getUserAmount();
    self.getRankingBounds()
#      $this->extractData();


  def readSource(self):
    if self.type == 1:
      file = "awardsMost"
    if self.type == 0:
      file = "awardsTop"
    if self.year == 0:
      file = f'{file}.JSON'
    else:
      file = f'{file}_{self.year}.JSON'
#  need to figure out what to do about this
#      $fname = __DIR__ ."/../JSON/rankings/".$file;
#      $y = file_get_contents($fname);
#      $this->inData = json_decode($y,true);


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

#    public function getAwardsJSON(){
#      echo json_encode($this->outData,true);
#    }
#
#    private function parseOutputParams($x){
#      $d = array(0 => array('photo'=>$x['photo'], 'name'=>$x['name']));
#      $outp = array('rank'=> $x['rank'], 'users'=>$d, 'countryId' => $x['countryId'], 'values'=> $x['values']);
#      if (isset($x['isMe'])){$outp['isMe'] = 1;}
#    return $outp;
#    }
#    private function extractData(){
#      $userFound = 0;
#      for ($v = $this->offset; ($v<($this->offset+$this->pageSize)&&($v<$this->userCount)); $v++){
#        $x = $this->inData['rankings'][$v];
#        if ($v == $this->userRank -1) {$x['isMe']=1;$userFound=1;}
#        $w[] = $this->parseOutputParams($x);
#      }
#      if ($userFound===0){
#        if ($this->userRank!==-1){
#          $this->inData['rankings'][$this->userRank-1]['isMe'] = 1;
#          if ($this->userRank < $this->offset){
#            array_unshift($w,$this->parseOutputParams($this->inData['rankings'][$this->userRank-1]));
#          }
#          else {
#            $w[] = $this->parseOutputParams($this->inData['rankings'][$this->userRank-1]);}
#        }
#      }
#      $this->outData = (object) array('rankings'=>$w, 'users'=>$this->userCount, 'lastUpdate'=>$this->inData['lastUpdate'], 'page'=>$this->page+1);
#    }
#
#    private function findUserRankData(){
#      if ($this->userRank!==-1){
#      $x = $this->inData['rankings'][$this->rank-1];
#      $y = array('rank'=> $x['rank'], 'name'=> $x['name'], 'photo'=> $x['photo'], 'values'=> $x['values'], 'user'=>1);
#      if (isset($x['countryId'])){$y['countryId']=$x['countryId'];}
#      return $y;
#      }
#    }
#    private function getUserAmount(){
#      $this->userCount = count($this->inData['rankings'],0);
#    }
#
