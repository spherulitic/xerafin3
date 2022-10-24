<?php
include (__DIR__ ."/../PHP/config.php");
require ("rankings.class.php");
require ("slothRankings.class.php");
require ("awards.class.php");
require ("metaranks.class.php");

function rankingsTest(){
	echo "<b>Test</b><br>";
	$y=array("today","yesterday","thisWeek","lastWeek","thisMonth","lastMonth","thisYear","lastYear","eternity");
	foreach ($y as $x){
		echo $x."<br><pre>";
		$data = (object) array('userid'=>10153882414837213, 'pageSize'=>10, 'pageNumber'=>1,'displayType'=>1,'period'=>$x);
		$rank = new Rankings($data);
		echo "<br><hr></pre>";
	}
}
$data = json_decode(file_get_contents("php://input"));
$pass = (object)[];
if (isset($_COOKIE["XSESSID"])) {
  $userid = getUseridFromXerfSess($_COOKIE["XSESSID"]);
} else { $userid = $data->userid; }
if (!((isset($userid) && (is_numeric($userid))))) {$pass->userid = '-1';}
else {$pass->userid = $userid;}
if (isset($data->displayType)) {$pass->displayType = $data->displayType;}
if ((isset($data->pageSize)) & (is_numeric($data->pageSize))) {$pass -> pageSize = $data -> pageSize;}
if ((isset($data->pageNumber)) & (is_numeric($data->pageNumber))) {$pass -> pageNumber = $data -> pageNumber;}
if (isset($data->timeframe)) {$pass->period = $data->timeframe;}
if (isset($data->type)){$pass->type = $data->type;}
if (isset($data->year)){$pass->year = $data->year;}
//$pass = (object) array('userid'=>10153882414837213, 'pageSize'=>50, 'pageNumber'=>1,'period'=>'weekly');
//$pass -> userid = "1028";
if (!isset($data->view)){$data->view = 'QA';}
switch ($data->view){
	case 'QA':
		if (($data->displayType==2) || ($data->displayType==3)){
			$rank = new Metaranks($pass);
		}
		else {
			$rank = new Rankings($pass);
		}
		$rank->getRankingsJSON();
		break;
	case 'AW': $rank = new Awards($pass);$rank->getAwardsJSON();break;
	case 'SL': $rank = new SlothRankings($pass);$rank->getRankingsJSON();break;
	default : $rank = new Rankings($pass);$rank->getRankingsJSON();break;
}


?>
