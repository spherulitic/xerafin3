<?php
	include_once ($_SERVER["DOCUMENT_ROOT"]."/PHP/config.php");
	session_start();
	error_reporting(E_ALL);
	ini_set('display_errors', 1);
	$data = json_decode(file_get_contents("php://input"));
	$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
	$query=	"select * from lexicon_info where lexicon='".$data->lex."'";
	$result = $mysqli->query($query);
	$rows = $result->fetch_assoc();
	$outp = array (
		'name' => utf8ize($rows['name']),
		'release' => utf8ize(date ('d-M-Y', strtotime($rows['release_date']))),
		'active' => utf8ize(date ('d-M-Y', strtotime($rows['active_date']))),
		'license' => utf8ize($rows['license']),
		'info' => utf8ize($rows['info']),
		'language' => utf8ize($rows['country'])
	);
	echo json_encode($outp,true);

?>
