<?php
include_once (__DIR__ ."/../PHP/config.php");
class SlothRankings {
	private $curDate;
	private $userid;
	private $pageSize;
	private $pageNumber;
	private $pageTotal;
	private $page;
	private $displayType;
	private $query;
	private $userCount;
	private $userRank;
	private $offset;
	private $rankData = [];
	private $periods = array("today","yesterday","thisWeek","lastWeek","thisMonth","lastMonth","thisYear","lastYear","eternity");

	private function getTimeConditionsQuery(){
		$x = "";
		switch ($this->period){
			case "today": $x="date = @datevalue";break;
			case "yesterday": $x="date = @datevalue - INTERVAL 1 DAY";break;
			case "thisWeek": $x="WEEK(date, 7) = WEEK(@datevalue,7) AND YEARWEEK(date,7) = YEARWEEK(@datevalue,7)";break;
			case "lastWeek": $x="WEEK(date, 7) = WEEK(@datevalue - INTERVAL 7 DAY,7) AND YEARWEEK(date,7) = YEARWEEK(@datevalue - INTERVAL 7 DAY,7)";break;
			case "thisMonth": $x="MONTH(date) = MONTH(@datevalue) AND YEAR(date) = YEAR(@datevalue)";break;
			case "lastMonth": $x="MONTH(date) = MONTH(@datevalue - INTERVAL 1 MONTH) AND YEAR(date) = YEAR(@datevalue - INTERVAL 1 MONTH)";break;
			case "thisYear": $x="YEAR(date) = YEAR(@datevalue)";break;
			case "lastYear": $x="YEAR(date) = YEAR(@datevalue - INTERVAL 1 YEAR)";break;
			case "eternity": $x="1";
			default: break;
		}
		return $x;
	}
	private function getSlothSubFilter(){
		$x = "";
		switch ($this->type){
			case 'unique':case 'all':$x = "1";break;
			case '100s':case 'all100s': $x = "correct>=100";break;
			case 'perfect':case 'allPerfect': $x = "correct>=100 AND accuracy>=100";break;
			default : $x = "1";break;
		}
		return $x;
	}
	private function getSlothSubSelect(){
		$x = "";
		switch ($this->type){
			case 'unique': case '100s' : case 'perfect' : $x = "DISTINCT ";break;
			case 'all': case 'all100s' : case 'allPerfect' : $x = "";break;
			default: $x="DISTINCT ";break;
		}
		return $x;
	}

	private function runQuery(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		//$mysqli = new mysqli("localhost", READ_USER, READ_PASS, READ_NAME);
		$temp = $this->query;
		$test = $mysqli->query("SET @datevalue = ".$this->curDate);  //Set Date Variable
		$result = $mysqli->query($temp) or die ("Error: ".mysqli_error($mysqli));
		$mysqli->close();
		return $result;
	}

	private function findUser(){
		$this->query = "
		SELECT name, photo, countryId, COUNT(".$this->getSlothSubSelect()." alphagram) AS total, userid, firstname, lastname
		FROM sloth_completed
		JOIN login
		USING (userid)
		JOIN user_prefs
		USING (userid)
		WHERE ".$this->getTimeConditionsQuery()." AND ".$this->getSlothSubFilter()."
		GROUP BY userid, name, photo, firstname, lastname, countryId
		ORDER BY total DESC, firstname ASC, lastname ASC";
		$res = $this->runQuery();
		$myrank = 0;
		while($row = $res->fetch_assoc()){
			$myrank++;
			if ($this->userid == $row['userid']){
				$this->userRank = $myrank;
				return;
			}
		}
		$this->userRank = -1;
		return;
	}

	private function checkEtern($insert){
		if ($this->period!== "eternity"){return " ".$insert." ";}
		return "";
	}

	private function countUsers(){
		$this->query = "SELECT COUNT(DISTINCT userid) AS users FROM sloth_completed WHERE ".$this->getTimeConditionsQuery()." AND ".$this->getSlothSubFilter();
		$res = $this->runQuery();
		while($row = $res->fetch_assoc()){
			$answer = $row;
			$this->userCount = $answer['users'];
		}
	}

	private function getRankingBounds(){
		if ($this->displayType == 1){
			$bound = $this->pageSize;
			if ($bound % 2 == 0) {$this->pageSize++;}
			if ($bound % 2 !== 0) {$bound--;}
			$bounds = $bound/2;

			$this->offset = $this->userRank - $bounds -1;
			if ($this->offset < 0) {$this->offset = 0;}
			if ($this->userRank + $bounds > $this -> userCount) {
				$this->offset = $this->userCount - $this->pageSize;
			}
			if ($this->offset < 0) {$this->offset = 0;}
			$this->pagetotal = 1;
			$this->page = 1;
		}
		else {
			$this->pageTotal = ceil($this->userCount / $this->pageSize);
			if ($this->pageTotal===0){$this->pageTotal=1;}
			$this->page = min(($this->pageNumber-1),($this->pageTotal));
			$this->offset = $this->pageSize*($this->page);
		}


	}

	private function getRankingsData(){
		$queryStart = "SELECT name, photo, countryId, COUNT(".$this->getSlothSubSelect()."alphagram) AS total, userid, firstname, lastname FROM sloth_completed
		JOIN login USING (userid)
		JOIN user_prefs USING (userid)";
		$this->query = $queryStart." WHERE ".$this->getTimeConditionsQuery()." AND ".$this->getSlothSubFilter()."
		GROUP BY userid, name, photo, firstname, lastname, countryId
		ORDER BY total DESC, firstname ASC, lastname ASC
		LIMIT ".$this->offset.",".$this->pageSize;
		$res = $this->runQuery();
		$rank = $this->offset;
		$this->rankData = [];
		$foundMe = false;
		while ($row = $res->fetch_assoc()){
			$rank++;
			if ($row['userid'] == $this->userid){
				$row['isMe']=true;
				$foundMe=true;
			}
			$row['rank']=$rank;
			$this->rankData[] = $row;
		}
		if ($foundMe==false){
			$this->query = $queryStart." WHERE "." userid=".$this->userid." AND ".$this->getSlothSubFilter()." AND ".$this->getTimeConditionsQuery()."
			GROUP BY userid, name, photo, firstname, lastname, countryId
			ORDER BY total DESC, firstname ASC, lastname ASC
			LIMIT 1";
			$res = $this->runQuery();
			while ($row = $res->fetch_assoc()){
				if ($row['userid'] == $this->userid){
					$row['isMe']=true;
					if ($this->userRank!==false){$row['rank']=$this->userRank;}
					if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
					else {$this->rankData[] = $row;}
				}
			}
		}
	}
	public function getRankingsJSON(){
		$b = [];
		foreach ($this->rankData as $row) {
			if (strlen($row['firstname'])==0){$d=$row['name'];}
			else {$d=$row['firstname']." ".$row['lastname'];}
			$c = array(
				'users'=> array(
					0 => array(
						'photo'=>$row['photo'], 'name'=>$d, 'answered'=> $row['total']
					)
				),
				'rank'=> $row['rank'], 'countryId'=> $row['countryId']
			);
			if (isset($row['isMe'])){$c['isMe'] = $row['isMe'];}
			$b[]= $c;
		}
		$a=array('rankings'=> $b, 'myRank'=> $this->userRank, 'period'=> $this->period, 'users' => $this->userCount, 'page' => $this->page+1 );
		echo json_encode($a,true);
	}

	function __construct($data) {
		if (isset($data->curDate)){
			$this->curDate = $data->curDate;
		}
		else {
			$this->curDate = "curdate()";
		}
		if (isset($data->type)){
			$this->type = $data->type;
		}
		else {
			$this->type = '100s';
		}
		if (isset($data->userid)){
			$this->userid = $data->userid;
		}
		else {
			$this->userid = -1;
		}
		if ((isset($data->pageSize)) && (is_int($data->pageSize)) && ($data->pageSize > 1) && ($data->pageSize <= 50)){
			$this->pageSize = $data->pageSize;
		}
		else {
			$this->pageSize = 10;
		}
		if ((isset($data->pageNumber)) && (is_int($data->pageNumber)) && ($data->pageNumber > 0)){
			$this->pageNumber = $data->pageNumber;
		}
		else {
			$this->pageNumber = 1;
		}
		if ((isset($data->displayType)) && (is_int($data->displayType)) && ($data->userid!==-1)){
			$this->displayType = $data->displayType;
		}
		else {
			$this->displayType = 0;
		}

		if ((isset($data->period)) && (in_array($data->period,$this->periods))){
			$this->period = $data->period;
		}
		else {
			$this->period = "today";
		}
		$this->countUsers();
		$this->findUser();
		$this->getRankingBounds();
		$this->getRankingsData();
		//basic debug stuff
		//echo "<pre>";
		//print_r($this);
		//echo "</pre>";
	}
}
?>
