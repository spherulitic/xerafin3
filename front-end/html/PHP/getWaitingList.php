<?php
	include_once (__DIR__ ."/../PHP/config.php");
	//ini_set('display_errors', 1);
	//ini_set('display_startup_errors', 1);
	//error_reporting(E_ALL);
	function getReady(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result = $mysqli->query("SELECT * FROM user_ready");
		$outp = [];
		while ($row = $result->fetch_assoc()){
			$row = array (
				'eMail'=>$row['email'],
				'handle' => $row['handle'],
				'firstname' =>$row['firstname'],
				'lastname' => $row['lastname'],
				'comments' => $row['comments'],
				'time' => $row['tos_agree']
			);
			$outp[]=$row;
		}
		return $outp;
	}
	echo json_encode(getReady(),true);
