<?php
	require_once ($_SERVER["DOCUMENT_ROOT"].'/vendor/facebook/autoload.php' );
	require ("manageSession.php");
	session_start();
	if (!isset($_SESSION['USER_ID'])){
		regenerateSession(true);
		echo "Retrieving Facebook ID";
	}
	else {
		if (($_SESSION['PRIV_LEVEL']>69)) {
			if (!isset($_SESSION['TEST_MODE'])) {$_SESSION['TEST_MODE']=true;}
			else {
				$_SESSION['TEST_MODE']=!$_SESSION['TEST_MODE'];
				if ($_SESSION['TEST_MODE']==true) {
					$switch = "ON";
				}
				else {$switch = "OFF";}
				echo "Xerafin test mode is now set to ".$switch;
			}
		}
		else {
			echo "You do not have the necessary privs to access this page: ".$_SESSION['USER_ID'];
			session_commit();
			die;
		}

	}
	session_commit();
?>
