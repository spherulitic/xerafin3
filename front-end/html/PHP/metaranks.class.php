<?php
include_once (__DIR__ ."/../PHP/config.php");
class Metaranks {
	private $curDate;
	private $currentRank = -1;
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
	private $periods = array(
		"daily","weekly","monthly","yearly",
		"monday","tuesday","wednesday","thursday","friday","saturday","sunday",
		"january","february","march","april","may","june","july","august","september","october","november","december"
	);
	private function getDateFormatForQuery(){
		$x = "1";
		switch ($this->period){
			case "weekly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%u')";break;
			case "monthly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%m')";break;
			case "yearly": $x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y')";break;
			case "daily": case "monday":case "tuesday":case "wednesday":case "thursday":case "friday":case "saturday":case "sunday":$x="dateStamp=CURDATE()";break;
			case "january":case "february":case "march":case "april":case "may":case "june":case "july":case "august":case "september":case "october":case "november":case "december":$x=substr($this->getTimeConditionsQuery(),1)."="."DATE_FORMAT(NOW(),'%Y%m')";break;
			default: break;
		}
		return $x;
	}
	private function getTimeConditionsQuery(){
		$x = "";
		$y = "DATE_FORMAT(dateStamp,";
		switch ($this->period){
			case "daily": $x=", dateStamp";break;
			case "weekly": $x=", ".$y."'%Y%u')";break;
			case "monthly": $x=", ".$y."'%Y%m')";break;
			case "yearly": $x=", ".$y."'%Y')";break;
			case "monday":case "tuesday":case "wednesday":case "thursday":case "friday":case "saturday":case "sunday":$x=", dateStamp";break;
			case "january":case "february":case "march":case "april":case "may":case "june":case "july":case "august":case "september":case "october":case "november":case "december":$x=", ".$y."'%Y%m')";break;
			default: break;
		}
		return $x;
	}

	private function setDateType(){
		$x = "";
		if (in_array($this->period,array("daily","monday","tuesday","wednesday","thursday","friday","saturday","sunday"))){
			$x = ", dateStamp AS date";
		}
		elseif (in_array($this->period,array("weekly"))){
			$x = ", MIN(dateStamp) AS date";
		}
		elseif (in_array($this->period,array("monthly","yearly","january","february","march","april","may","june","july","august","september","october","november","december"))){
			$x = ", MIN(dateStamp) AS date";
		}
		else {
			$x = "";
		}
		return $x;
	}
	private function setDay(){
		$x = "";
		switch ($this->period){
			case "monday":$x=0;break;
			case "tuesday":$x=1;break;
			case "wednesday":$x=2;break;
			case "thursday":$x=3;break;
			case "friday":$x=4;break;
			case "saturday":$x=5;break;
			case "sunday":$x=6;break;
			default: break;
		}
		if ($x!=="") {
			return "WEEKDAY(dateStamp)=".$x;
		}
		return $x;
	}
	private function setMonth(){
		$x = "";
		switch ($this->period){
			case "january":$x=1;break;
			case "february":$x=2;break;
			case "march":$x=3;break;
			case "april":$x=4;break;
			case "may":$x=5;break;
			case "june":$x=6;break;
			case "july":$x=7;break;
			case "august":$x=8;break;
			case "september":$x=9;break;
			case "october":$x=10;break;
			case "november":$x=11;break;
			case "december":$x=12;break;
			default: break;
		}
		if ($x!=="") {
			return "MONTH(dateStamp)=".$x;
		}
		return $x;
	}
	private function runQuery(){
		//$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$mysqli = new mysqli("localhost", READ_USER, READ_PASS, READ_NAME);
		$temp = $this->query;
		//$test = $mysqli->query("SET @datevalue = ".$this->curDate);  //Set Date Variable
		$result = $mysqli->query($temp) or die ("Error: ".mysqli_error($mysqli));
		$mysqli->close();
		return $result;
	}
	private function findUser($findCurrent=true){
		$found = false;
		$this->query = "
		SELECT userid, SUM(questionsAnswered) AS total ".$this->setDateType().", name, firstname, lastname
		FROM leaderboard
		JOIN login USING (userid)
		JOIN user_prefs
		USING (userid) ".$this->checkWhere().$this->setDay().$this->setMonth()."
		GROUP BY userid".$this->getTimeConditionsQuery().", name, firstname, lastname
		ORDER BY total DESC, date ASC, firstname ASC, lastname ASC ";
		$res = $this->runQuery();
		$this->userRank = -1;
		$myrank = 0;
		$date = date("Y-m-d");
		//echo $this->query;
		while($row = $res->fetch_assoc()){
			$myrank++;
			if ($this->userid == $row['userid']){
					if ($found === false){
						$found=true;
						$this->userRank = $myrank;
					}
					if ($findCurrent){
						//echo "\n".$myrank."\n";
						if ($this->compareDateWithCurrent($row['date'])===true) {
							$this->currentRank = $myrank;
							return;
						}
					}
					else {
						if (($found) && ($findCurrent===false)){return;}
				}
			}
		}
		return;
	}

	private function checkWhere(){
		if (!in_array($this->period,array("daily","weekly","monthly","yearly"))){
			return " WHERE ";
		}
		return "";
	}
	private function checkAnd(){
		if (!in_array($this->period,array("daily","weekly","monthly","yearly"))){
			return " AND ";
		}
		return "";
	}
	private function countUsers(){
		$this->query = "
		SELECT COUNT(userid) AS users FROM (
			SELECT userid".$this->setDateType()."
			FROM leaderboard".$this->checkWhere().$this->setDay().$this->setMonth()."
			GROUP BY userid".$this->getTimeConditionsQuery()."
		) AS TMP";
		$res = $this->runQuery();
		while($row = $res->fetch_assoc()){
			$answer = $row;
			$this->userCount = $answer['users'];
		}
	}
	private function compareDateWithCurrent($d){
		$t = strtotime($d);
		$v = strtotime("now");
		if (in_array($this->period,array("monday","tuesday","wednesday","thursday","friday","saturday","sunday"))){
			if (date("D", $t)!=="Mon"){$x = strtotime("last monday, 12pm", $t);} else {$x = $t;}
			if (date("D", $v)!=="Mon"){$y = strtotime("last monday, 12pm", $v);} else {$y = $v;}
			//echo date('Y m d', $x)."...".date('Y m d', $y)."/n";
			return ((date("Y m d", $x) === date("Y m d", $y)) && (date("D", $t) === date("D", $v)));
		}
		elseif (in_array($this->period,array("january","february","march","april","may","june","july","august","september","october","november","december"))){
			return (date("Y M", $t) === date("Y M", $v));
		}
		elseif (in_array($this->period,array("weekly"))){
			return (date("Y W",$t)===date("Y W",$v));
		}
		elseif (in_array($this->period,array("yearly"))){
			return (date("Y",$t)===date("Y",$v));
		}
		elseif (in_array($this->period,array("monthly"))){
			//echo $t."-".$v."...";
			return (date("Y m",$t)===date("Y m",$v));
		}
		elseif (in_array($this->period,array("daily"))){
			return (date("Y m d", $t)===date("Y m d", $v));
		}
		else {return false;}
	}
	private function formatDate($d){
		$t = strtotime($d);
		if (in_array($this->period,array("daily","monday","tuesday","wednesday","thursday","friday","saturday","sunday"))){
			$n = date("d M Y", $t);
		}
		elseif (in_array($this->period,array("yearly","january","february","march","april","may","june","july","august","september","october","november","december"))){
			$n = date("Y", $t);
		}
		elseif (in_array($this->period,array("monthly"))){
			$n = date("M Y", $t);
		}
		elseif (in_array($this->period,array("weekly"))){
			if (date("D", $t)!=="Sun"){
				$x = strtotime("next sunday, 12pm", $t);
				$n = date("d M Y", $x);
			}
			else {$n = date("d M Y ", $t);}
		}
		else {
			$n = $d;
		}
		return $n;
	}
	private function getRankingBounds(){
		if ($this->displayType == 3){
			$bound = $this->pageSize;
			if ($bound % 2 == 0) {$this->pageSize++;}
			if ($bound % 2 !== 0) {$bound--;}
			$bounds = $bound/2;
			if ($this->currentRank!==-1){
				$index = $this->currentRank;
			}
			else {$index = $this->userRank;}
			$this->offset = $index - $bounds -1;
			if ($this->offset < 0) {$this->offset = 0;}
			if ($index + $bounds > $this -> userCount) {
				$this->offset = $this->userCount - $this->pageSize;
			}
			if ($this->offset < 0) {$this->offset = 0;}
			$this->pagetotal = 1;
			$this->page = 1;
		}
		else {
			$this->pageTotal = ceil($this->userCount / $this->pageSize);
			if ($this->pageTotal===0){$this->pageTotal=1;}
			$this->page = min($this->pageNumber-1,$this->pageTotal);
			$this -> offset = $this->pageSize*($this->page);
		}
	}

	private function getRankingsData(){
		$queryStart = "SELECT name, photo, countryId, SUM(questionsAnswered) AS total".$this->setDateType().", userid, firstname, lastname FROM leaderboard
		JOIN login USING (userid)
		JOIN user_prefs USING (userid)";
		$this->query = $queryStart.$this->checkWhere().$this->setDay().$this->setMonth()."
		GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
		ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
		LIMIT ".$this->offset.",".$this->pageSize;
	//	echo $this->query;
		$res = $this->runQuery();
		$rank = $this->offset;
		$this->rankData = [];
		$foundMe = false;
		$foundCurrent = false;
		while ($row = $res->fetch_assoc()){
			$rank++;
			if ($row['userid'] == $this->userid) {
				$row['isMe']=true;
				if ($rank === $this->userRank){
					$foundMe = true;
				}
				if (($rank === $this->currentRank)  && ($this->currentRank!==-1)){
					$foundCurrent = true;
					$row['isCurrent'] = true;
				}
			}
			$row['rank']=$rank;
			$this->rankData[] = $row;

		}
		if (($foundMe==false) && ($this->userRank!==-1)){
			$this->query = $queryStart." WHERE "." userid=".$this->userid.$this->checkAnd().$this->setDay().$this->setMonth()."
			GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
			ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
			LIMIT 1";
			$res = $this->runQuery();
			while ($row = $res->fetch_assoc()){
				if ($row['userid'] == $this->userid){
					$row['isMe']=true;
					if (($this->userRank === $this->currentRank)  && ($this->currentRank!==-1)){
						$foundCurrent = true;
						$row['isCurrent'] = true;
					}
					if ($this->userRank!==-1){$row['rank']=$this->userRank;}
					if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
					elseif (($foundCurrent===true) && ($row['rank'] < $this->rankData[1]['rank'])) {
						array_splice($this->rankData, 1, 0, array($row));
					}
					else {$this->rankData[] = $row;}
				}
			}
		}
		if (($foundCurrent==false) && ($this->currentRank!==-1)  && ($this->userRank!==-1)){
			$this->query = $queryStart." WHERE "." userid=".$this->userid.$this->checkAnd().$this->setDay().$this->setMonth()."
			AND ".$this->getDateFormatForQuery()."
			GROUP BY userid, name".$this->getTimeConditionsQuery().", photo, firstname, lastname, countryId
			ORDER BY total DESC, date ASC, firstname ASC, lastname ASC
			LIMIT 1";
			$res = $this->runQuery();
			while ($row = $res->fetch_assoc()){
				if ($row['userid'] == $this->userid){
					$row['isMe']=true;
					$row['isCurrent']=true;
					$row['rank']=$this->currentRank;
					if ($row['rank'] < $this->rankData[0]['rank']){array_unshift($this->rankData, $row);}
					elseif (($row['rank'] < $this->rankData[1]['rank']) && ($foundCurrent === false)) {
						array_splice($this->rankData, 1, 0, array($row));
					}
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
				'rank'=> $row['rank'], 'countryId'=> $row['countryId'], 'date'=> $this->formatDate($row['date'])
			);
			if (isset($row['isMe'])){$c['isMe'] = $row['isMe'];}
			if (isset($row['isCurrent'])){$c['isCurrent'] = $row['isCurrent'];}
			$b[]= $c;
		}
		$a=array('rankings'=> $b, 'myRank'=> $this->userRank, 'myCurrent'=> $this->currentRank, 'period'=> $this->period, 'users' => $this->userCount, 'page' => $this->page+1);
		echo json_encode($a,true);
	}

	function __construct($data) {
		if (isset($data->curDate)){
			$this->curDate = $data->curDate;
		}
		else {
			$this->curDate = "curdate()";
		}
		if ((isset($data->displayType)) && (is_int($data->displayType)) && ($data->userid!==-1)){
			$this->displayType = $data->displayType;
		}
		else {
			$this->displayType = 2;
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
		if ((isset($data->period)) && (in_array($data->period,$this->periods))){
			$this->period = $data->period;
		}
		else {
			$this->period = "daily";
		}
		$this->countUsers();
		$this->findUser();
		$this->getRankingBounds();
		$this->getRankingsData();
	}
}
?>
