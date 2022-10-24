<?php
	include_once('config.php');

	function checkErrorHistory($value){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query="SELECT id, time, status FROM errorLog WHERE code='".$value."' ORDER BY id ASC LIMIT 1";
		$result=$mysqli->query($query);
		$rows = $result->num_rows;
		if ($rows>0){
			while($row = mysqli_fetch_assoc($result)){
				$outp= $row;
			}
			echo json_encode(array ('found' => true, 'status' => ERROR_STAT[intval($outp["status"])], 'time' => $outp["time"], 'id' => $outp["id"]));
		}
		else {$x = array('found' => false);echo json_encode($x);}
	}

	function checkErrorLogTable() {
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query="SELECT * FROM information_schema.tables WHERE table_schema = '".DB_NAME."' AND table_name = 'errorLog' LIMIT 1";
		$result = $mysqli->query($query);
		$rows = $result->num_rows;
		if ($rows>0){return true;}
		else {return false;}
	}

	$data = json_decode(file_get_contents("php://input"));

	if (isset($data->ident)){
		$x = $data->ident;
		checkErrorHistory($x);
	}
	else {echo "ERROR";}
?>
