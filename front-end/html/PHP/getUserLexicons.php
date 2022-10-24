<?php
include_once ("config.php");
	session_start();
	if (isset($_COOKIE['XSESSID'])) {
		$userid = getUseridFromXerfSess($_COOKIE['XSESSID']);
	}
	else {
		$userid = $_SESSION['USER_ID'];
	}
	error_reporting(E_ALL);
	ini_set('display_errors', 1);
	$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
	$query = "SELECT lexicon from user_lexicon_master WHERE userid ='".$userid."'";
	$lex = $mysqli->query($query) OR DIE ($mysqli->error);
	while ($row = $lex->fetch_assoc()){
		$defaultLex = utf8ize($row['lexicon']);
	}
	$query = "SELECT version from user_lexicon_master WHERE userid ='".$userid."' AND lexicon ='".$defaultLex."'";
	$lex = $mysqli->query($query) OR DIE ($mysqli->error);
	while ($row = $lex->fetch_assoc()){
		$version = utf8ize($row['version']);
	}
	$query=	"SELECT l.name, l.country, l.replaced_by, t.lexicon, t.version  FROM user_lexicon_master t
	JOIN lexicon_info l ON CONCAT(t.lexicon,t.version) = l.lexicon WHERE userid='".$userid."'";
	$result = $mysqli->query($query) OR DIE ($mysqli->error);
	$outP=[];
	while ($row = $result->fetch_assoc()){
		$x= array (
			'name' => utf8ize($row['name']),
			'country' => utf8ize($row['country']),
			'lexicon' => utf8ize(strtolower($row['lexicon'])),
			'version' => utf8ize($row['version']),
			'replaced_by' => utf8ize($row['replaced_by'])
		);
		$outP[] = $x;
		//if ($x['lexicon'] === $defaultLex) {$defaultLex = $x['lexicon'].$x['version'];}

	}
	//print_r ($outP);

	$z=[];
	$z = array ('values' => $outP, 'default' =>  array('lexicon' => $defaultLex,'version' => $version));
	//print_r ($z);
	echo json_encode($z,true);
?>
