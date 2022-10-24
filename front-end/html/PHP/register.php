<?php
	include_once ('register.class.php');
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);
	$data = json_decode(file_get_contents("php://input"), true);
	$register = new Register($data, true);
	echo $register->send();
?>
