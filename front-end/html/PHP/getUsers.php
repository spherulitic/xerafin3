<?php
include_once "config.php";
session_start();

if (isset($_SESSION['PRIV_LEVEL'])){
if ($_SESSION['PRIV_LEVEL']>59) {
	$data = json_decode(file_get_contents("php://input"));
	//print_r($data);
	$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
	$query = "
		SELECT userid, secLevel, name,photo
		FROM user_prefs
		JOIN login USING (userid) WHERE ".$data->queryType;
	if ($data->queryType=='secLevel'){$query.=" = ".intval($data->val);}
	else {$query.=" LIKE '%".$data->val."%'";}
	$query.="
		AND (secLevel<".$_SESSION['PRIV_LEVEL']." OR ".$_SESSION['PRIV_LEVEL'].">=70)
		ORDER BY name";
	$result = $mysqli->query($query);
	$outp = array();
	while($row = mysqli_fetch_assoc($result)){
		$row['name'] = utf8ize($row['name']);
		$outp[]= $row;
	}
	echo json_encode($outp);
	//echo json_last_error();
	mysqli_close($mysqli);
}
}
?>
