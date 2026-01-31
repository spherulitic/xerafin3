<?php
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);
	session_start();
	include_once ("authorize.class.php");
	if ($_SESSION['PRIV_LEVEL']>=60){
		$data = json_decode(file_get_contents("php://input"), true);
		$x = new authorize($data['handle'],$data['response'],$data['msg']);
	}
?>
