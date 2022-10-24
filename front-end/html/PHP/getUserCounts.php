<?php
	include_once (__DIR__ ."/../PHP/config.php");
	//ini_set('display_errors', 1);
	//ini_set('display_startup_errors', 1);
	//error_reporting(E_ALL);
	session_start();
	function getUsers(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result = $mysqli->query("SELECT count(*) AS total FROM user_auth");
		while ($row = $result->fetch_assoc()){
			$a = $row['total'];
		}
		$mysqli->close();
		return intval($a);
	}
	function getWaiting(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result = $mysqli->query("SELECT count(*) AS total FROM user_ready");
		while ($row = $result->fetch_assoc()){
			$a = $row['total'];
		}
		$mysqli->close();
		return intval($a);
	}
	function getLinks(){
		//For when It becomes available
		return 0;
	}
	function getBugs(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result=$mysqli->query("SELECT COUNT(DISTINCT code) as count FROM errorLog WHERE status < 2");
		$rows = $result->fetch_assoc();
		$mysqli->close();
		return intval($rows['count']);
	}
	function output(){
		if ($_SESSION['PRIV_LEVEL']>59){
			$x = array('users'=>getUsers(),'wait'=>getWaiting(),'links'=>getLinks(),'errors'=>getBugs());
			echo json_encode($x, true);
		}
	}
	output();
?>
