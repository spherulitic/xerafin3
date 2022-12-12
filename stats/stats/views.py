from stats import app
from flask import request, jsonify, Response, g, session
import json, urllib, requests, jwt
from logging.config import dictConfig
from dateutil.relativedelta import *
import calendar
import sys
import datetime
import xerafinUtil.xerafinUtil as xs
#from .rankings import Rankings
#from .slothRankings import SlothRankings
#from .awards import Awards

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

class Metaranks(object):
  def __init__(self, data):
    # default to the MySQL function curdate()
    self.curdate = data.get("curDate", "curdate()")
    self.displayType = int(data.get("displayType", 2))
    self.pageSize = max(min(int(data.get("pageSize", 10)),50),2)
    self.pageNumber = max(int(data.get("pageNumber", 1)),1)
    self.period = data.get("period", "daily")
    if self.period not in PERIODS:
      self.period = "daily"
    self.countUsers();
    self.findUser()

   ### RESTART HERE ###
#    $this->getRankingBounds();
#    $this->getRankingsData();

  def countUsers(self):
    self.query = f"""SELECT COUNT(userid) FROM (
                     SELECT userid{self.setDateType()}
      FROM leaderboard{self.checkWhere()}{self.setDay()}{self.setMonth()}
      GROUP BY userid{self.getTimeConditionsQuery()}) AS TMP"""

    # note -- the PHP was returning an assoc array with column names mapped to values
    # to do this in Python you need to use cursor.description
    # result is returning cursor.fetchall() which only contains the values
    result = self.runQuery();
    for row in result:
      self.userCount = row[0]


#<?php
#include_once (__DIR__ ."/../PHP/config.php");
#class Metaranks {
#  private $curDate;
#  private $currentRank = -1;
#  private $userid;
#  private $pageSize;
#  private $pageNumber;
#  private $pageTotal;
#  private $page;
#  private $displayType;
#  private $query;
#  private $userCount;
#  private $userRank;
#  private $offset;
#  private $rankData = [];
#  private function getDateFormatForQuery(){
#    $x = "1";
#    switch ($this->period){
#      case "weekly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%u')";break;
#      case "monthly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%m')";break;
#      case "yearly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y')";break;
#      case "daily": case "monday":case "tuesday":case "wednesday":case "thursday":case "friday":case "saturday":case "sunday":$x="dateStamp=CURDATE()";break;
#      case "january":case "february":case "march":case "april":case "may":case "june":case "july":case "august":case "september":case "october":case "november":case "december":$x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%m')";break;
#      default: break;
#    }
#    return $x;
#  }

  def getTimeConditionsQuery(self):
    x = ""
    y = "DATE_FORMAT(dateStamp,"
    if self.period == "daily":
      x = ", dateStamp"
    elif self.period == "weekly":
      x = f", {y}'%Y%u')"
    elif self.period == "monthly":
      x = f", {y}'%Y%m')"
    elif self.period == "yearly":
      x = f", {y}'%Y')"
    elif self.period in DAYS:
      x = ",dateStamp"
    elif self.period in MONTHS:
      x = f", {y}'%Y%m')"

    return x

  def setDateType(self):
    if self.period in ["daily","monday","tuesday","wednesday","thursday",
                       "friday","saturday","sunday"]:
      x = ", dateStamp AS date"
    elif self.period in ["weekly"]:
      x = ", MIN(dateStamp) AS date"
    elif self.period in ["monthly","yearly","january","february","march","april",
                         "may","june","july","august","september","october",
                         "november","december"]:
      x = ", MIN(dateStamp) AS date";
    else:
      x = ""
    return x;


  def setDay(self):
   try:
     x = DAYS.index(self.period)
   except ValueError:
     return ""
   return f"WEEKDAY(dateStamp)={x}"

  def setMonth(self):
    try:
      x = MONTHS.index(self.period)+1
    except ValueError:
      return ""
    return f"MONTH(dateStamp)={x}"

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
    date = datetime.today().strftime('%Y-%m-%d')
    # TO DO: change this to use a dict cursor or better yet, ORM
    # columns in result set: [userid, questionsAnswered, date, name, firstname, lastname]
    for row in result:
      myrank += 1
      if g.uuid == row[0]:
        if not found:
          found == True
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
    else:
      return ""

  def checkAnd(self):
    if self.period not in ["daily","weekly","monthly","yearly"]:
      return " AND "
    else:
      return ""

  def compareDateWithCurrent(self, d):
    date_in = datetime.strptime(d, '%Y-%m-%d')
    now = datetime.now()
    if this.period in DAYS:
      # if the date isn't a Monday, grab the previous Monday at 12 pm
      delta = relativedelta(weekday=MO(-1), hour=12, minute=0, second=0, microsecond=0)
      if date_in.weekday() != 1:
        x = date_in + delta
      else:
        x = date_in
      if now.weekday() != 1:
        last_monday = now + delta
      else:
        last_monday = now
      return (x.date() == last_monday.date()) and (date_in.weekday() == now.weekday())
    elif this.period in MONTHS + ["monthly"]:
      return now.month == date_in.month and now.year == date_in.year
    elif this.period == "daily":
      return now.date() == date_in.date()
    elif this.period == "weekly":
      return now.isocalendar().week == date_in.isocalendar.week() and now.year == date_in.year
    elif this.period == "yearly":
      return now.year == date_in.year
    else:
      return False

#  private function formatDate($d){
#    $t = strtotime($d);
#    if (in_array($this->period,array("daily","monday","tuesday","wednesday","thursday","friday","saturday","sunday"))){
#      $n = date("d M Y", $t);
#    }
#    elseif (in_array($this->period,array("yearly","january","february","march","april","may","june","july","august","september","october","november","december"))){
#      $n = date("Y", $t);
#    }
#    elseif (in_array($this->period,array("monthly"))){
#      $n = date("M Y", $t);
#    }
#    elseif (in_array($this->period,array("weekly"))){
#      if (date("D", $t)!=="Sun"){
#        $x = strtotime("next sunday, 12pm", $t);
#        $n = date("d M Y", $x);
#      }
#      else {$n = date("d M Y ", $t);}
#    }
#    else {
#      $n = $d;
#    }
#    return $n;
#  }
#  private function getRankingBounds(){
#    if ($this->displayType == 3){
#      $bound = $this->pageSize;
#      if ($bound % 2 == 0) {$this->pageSize++;}
#      if ($bound % 2 !== 0) {$bound--;}
#      $bounds = $bound/2;
#      if ($this->currentRank!==-1){
#        $index = $this->currentRank;
#      }
#      else {$index = $this->userRank;}
#      $this->offset = $index - $bounds -1;
#      if ($this->offset < 0) {$this->offset = 0;}
#      if ($index + $bounds > $this -> userCount) {
#        $this->offset = $this->userCount - $this->pageSize;
#      }
#      if ($this->offset < 0) {$this->offset = 0;}
#      $this->pagetotal = 1;
#      $this->page = 1;
#    }
#    else {
#      $this->pageTotal = ceil($this->userCount / $this->pageSize);
#      if ($this->pageTotal===0){$this->pageTotal=1;}
#      $this->page = min($this->pageNumber-1,$this->pageTotal);
#      $this -> offset = $this->pageSize*($this->page);
#    }
#  }
#
#  private function getRankingsData(){
#    $queryStart = "SELECT name, photo, countryId, SUM(questionsAnswered) AS total".$this->setDateType().", userid, firstname, lastname FROM leaderboard
#    JOIN login USING (userid)
#    JOIN user_prefs USING (userid)";
#    $this->query = $queryStart.$this->checkWhere().$this->setDay().$this->setMonth()."
#    GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
#    ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
#    LIMIT ".$this->offset.",".$this->pageSize;
#  //  echo $this->query;
#    $res = $this->runQuery();
#    $rank = $this->offset;
#    $this->rankData = [];
#    $foundMe = false;
#    $foundCurrent = false;
#    while ($row = $res->fetch_assoc()){
#      $rank++;
#      if ($row['userid'] == $this->userid) {
#        $row['isMe']=true;
#        if ($rank === $this->userRank){
#          $foundMe = true;
#        }
#        if (($rank === $this->currentRank)  && ($this->currentRank!==-1)){
#          $foundCurrent = true;
#          $row['isCurrent'] = true;
#        }
#      }
#      $row['rank']=$rank;
#      $this->rankData[] = $row;
#
#    }
#    if (($foundMe==false) && ($this->userRank!==-1)){
#      $this->query = $queryStart." WHERE "." userid=".$this->userid.$this->checkAnd().$this->setDay().$this->setMonth()."
#      GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
#      ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
#      LIMIT 1";
#      $res = $this->runQuery();
#      while ($row = $res->fetch_assoc()){
#        if ($row['userid'] == $this->userid){
#          $row['isMe']=true;
#          if (($this->userRank === $this->currentRank)  && ($this->currentRank!==-1)){
#            $foundCurrent = true;
#            $row['isCurrent'] = true;
#          }
#          if ($this->userRank!==-1){$row['rank']=$this->userRank;}
#          if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
#          elseif (($foundCurrent===true) && ($row['rank'] < $this->rankData[1]['rank'])) {
#            array_splice($this->rankData, 1, 0, array($row));
#          }
#          else {$this->rankData[] = $row;}
#        }
#      }
#    }
#    if (($foundCurrent==false) && ($this->currentRank!==-1)  && ($this->userRank!==-1)){
#      $this->query = $queryStart." WHERE "." userid=".$this->userid.$this->checkAnd().$this->setDay().$this->setMonth()."
#      AND ".$this->getDateFormatForQuery()."
#      GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
#      ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
#      LIMIT 1";
#      $res = $this->runQuery();
#      while ($row = $res->fetch_assoc()){
#        if ($row['userid'] == $this->userid){
#          $row['isMe']=true;
#          $row['isCurrent']=true;
#          $row['rank']=$this->currentRank;
#          if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
#          elseif (($row['rank'] < $this->rankData[1]['rank']) && ($foundCurrent === false)) {
#            array_splice($this->rankData, 1, 0, array($row));
#          }
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
#        'rank'=> $row['rank'], 'countryId'=> $row['countryId'], 'date'=> $this->formatDate($row['date'])
#      );
#      if (isset($row['isMe'])){$c['isMe'] = $row['isMe'];}
#      if (isset($row['isCurrent'])){$c['isCurrent'] = $row['isCurrent'];}
#      $b[]= $c;
#    }
#    $a=array('rankings'=> $b, 'myRank'=> $this->userRank, 'myCurrent'=> $this->currentRank, 'period'=> $this->period, 'users' => $this->userCount, 'page' => $this->page+1);
#    echo json_encode($a,true);
#  }
#
#}
#?>
