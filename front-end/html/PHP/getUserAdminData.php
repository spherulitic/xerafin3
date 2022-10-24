<?php
	include ("config.php");
	session_start();
	if ($_SESSION['PRIV_LEVEL']>59){
		$data = file_get_contents("php://input");
		$obj= $data;
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query=	"select * from user_prefs join login using (userid) where userid=".$_POST['userid']." AND (secLevel<".$_SESSION['PRIV_LEVEL']." OR ".$_SESSION['PRIV_LEVEL'].">=70)";
		$result = $mysqli->query($query);
		$outp = array();
		while($row = mysqli_fetch_assoc($result)){
			$outp[]= $row;
		}
		echo json_encode($outp);
		mysqli_close($mysqli);
	}
?>
