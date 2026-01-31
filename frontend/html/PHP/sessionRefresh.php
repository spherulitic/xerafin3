<?php
	include "manageSession.php";
	session_start();
	if (!isset($_SESSION['USER_ID'])){
		regenerateSession(true);
	}
	if(!isset($_SESSION['TEST_MODE'])) {
		$_SESSION['TEST_MODE']=false;
	}
	$state = checkSession();
	session_commit();
?>
