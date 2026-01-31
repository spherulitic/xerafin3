<?php
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);
	include_once ("authorize.class.php");
	session_start();
	if ($_SESSION['PRIV_LEVEL']>=60){
		$data = json_decode(file_get_contents("php://input"), true);
		foreach ($data['handle'] as $value){
			$x = new authorize($value,true,'');
		}
	}
?>
