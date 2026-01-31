<?php
	include ("config.php");
	session_start();
	if ($_SESSION['PRIV_LEVEL']>59){
		$data = file_get_contents("php://input");
		$obj= $data;
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		if (($_SESSION['PRIV_LEVEL']>$_POST['newPriv']) OR ($_SESSION['PRIV_LEVEL']>=70)){
			$query=	"update user_prefs set secLevel=".$_POST['newPriv']." where userid=".$_POST['userid'];
			$result = $mysqli->query($query);
		}
		mysqli_close($mysqli);
	}
?>
