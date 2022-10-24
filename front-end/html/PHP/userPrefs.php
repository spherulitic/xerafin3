<?php
	include_once ($_SERVER["DOCUMENT_ROOT"]."/PHP/config.php");
	session_start();
	error_reporting(E_ALL);
	ini_set('display_errors', 1);


	function getNation(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query=	"select countryId from user_prefs where userid=".$_SESSION['USER_ID'];
		$result = $mysqli->query($query);
		$rows = $result->fetch_assoc();
		$mysqli->close();
		return $rows['countryId'];
	}

	function setNation($nation,$user){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query=	"UPDATE user_prefs SET countryId=".$nation." WHERE userid=".$user;
		$result = $mysqli->query($query);
		$mysqli->close();
	}
	function getDefaultLexicon(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query=	"select lexicon from user_prefs where userid=".$_SESSION['USER_ID'];
		$result = $mysqli->query($query);
		$rows = $result->fetch_assoc();
		return strtoupper($rows['lexicon']);
	}
	function getActiveLexicons(){
		$newestLex = array('CSW' => 21);
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query=	"select lexicon, version from user_lexicon_master where userid=".$_SESSION['USER_ID'];
		$result = $mysqli->query($query);
		$row = [];
		while($rows = $result->fetch_assoc()){
			$t = strtoupper($rows['lexicon']);
			$temp = array('lexicon' => $t, 'version' => $rows['version']);
			if (array_key_exists($t,$newestLex)){
				if ($newestLex[$t]!==$rows['version']) {
					$temp['update'] = $newestLex[$t];
				}
			}
			if (getDefaultLexicon() == $t){$temp['default']=1;}
			$row[] = $temp;
		}
		$mysqli->close();
		return $row;
	}
	$data = json_decode(file_get_contents("php://input"));
  if (isset($_COOKIE['XSESSID'])) {
    $userid = getUseridFromXerfSess($_COOKIE['XSESSID']);
  } else { $userid = $data->userid; }

	if ($userid==$_SESSION['USER_ID']){
		$outp = [];
		foreach ($data->action as $action){
			switch ($action) {
				case "GTN": $outp['nation'] = getNation();break;
				case "STN": setNation($data->nation,$userid);break;
				case "LEX": $outp['lexes'] = getActiveLexicons();break;
			}
		}
		echo json_encode($outp,true);
	}
?>
