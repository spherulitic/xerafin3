<?php
	//ini_set('display_errors', 1);
	//ini_set('display_startup_errors', 1);
	//error_reporting(E_ALL);
	include_once ('config.php');
	session_start();
	function newErrorTable(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = "CREATE TABLE errorLog (id INT(25) UNSIGNED AUTO_INCREMENT=100001 PRIMARY KEY,time INT(32) UNSIGNED,userid VARCHAR(50),OS VARCHAR(50),browser VARCHAR(50),browserVer VARCHAR(20),code VARCHAR(100),status INT(6),screen VARCHAR(20),mobile BOOLEAN,common INT(25))";
		if ($mysqli->query($query)!==TRUE){
			//echo $mysqli->error."/n";
		}
	}

	function checkErrorDir($val){
		$fname= __DIR__ ."/../".$val;
		//echo ($fname." ".file_exists($fname));
		if (!file_exists($fname)){
			mkdir($fname,0777, true);
		}
	}
	function findCommon($code){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = $mysqli->prepare("SELECT id,common,status FROM errorLog WHERE code = (?) AND common = -1 LIMIT 1");
		$query->bind_param('s',$code);
		$query->execute();
		$result = $query->get_result();
		if ($result->num_rows > 0){
			$row = $result->fetch_assoc();
			$id = $row['id'];
			$status = $row['status'];
			if ($status = 4) {$status = 0;}
		}
		else {$id = -1;$status = 0;}
		$mysqli->close();
		return array('id'=>$id,'status'=>$status);
	}

	function writeNewError($data){
		if (isset($_COOKIE['XSESSID'])) {
			$userid = getUseridFromXerfSess($_COOKIE['XSESSID']);
		}
		else {
			$userid = $data->user;
		}
		$common = findCommon($data->ident);
		$x = time();
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = $mysqli->prepare("INSERT INTO errorLog (time, userid, OS, browser, browserVer, code, status, screen, mobile, common) VALUES (?,?,?,?,?,?,?,?,?,?)");
		$tmp = "isssssisii";
    $tmp2 = intval($data->mobile);
		$query->bind_param($tmp, $x, $userid, $data->OS, $data->browser, $data->browserVer, $data->ident, $common['status'], $data->screen, $tmp2, $common['id']);
		$query->execute();
		$query->close();
		$query = $mysqli->prepare("SELECT id FROM errorLog WHERE (time= ?) AND (userid = ?) AND (code= ?) LIMIT 1");
		$tmp = "iss";
		$query->bind_param($tmp, $x, $userid, $data->ident);
		$query->execute();
		$result = $query->get_result();
		if ($result->num_rows > 0){
			$row = $result->fetch_assoc();
			$id = $row['id'];
			//checkErrorDir(ERROR_DIR);
			if (isset($data->log)) {createErrorLogFile($data->log,$id);}
		}
		$query->close();
		return array('id'=>$id);
	}
	function getInstanceIds($code){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result = $mysqli->query("SELECT id,code FROM errorLog WHERE code='".$code."' ORDER BY id ASC");
		$op = [];
		while ($row = $result->fetch_assoc()){
			$op[]=$row['id'];
		}
		$mysqli->close();
		return $op;
	}
	function test($data){
		print_r($data);
	}
	function changeStatus($data){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = $mysqli->prepare("UPDATE errorLog SET status = ? WHERE id = ? OR common = ?");
		$tmp = "iii";
		$query->bind_param($tmp, $data->status, $data->id, $data->id);
		$query->execute();
		$query->close();
		$mysqli->close();
	}
	function getCode($id){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = $mysqli->prepare("SELECT code FROM errorLog WHERE id = (?)");
		$query->bind_param('s',$id);
		$query->execute();
		$result = $query->get_result();
		if ($result->num_rows > 0){
			$row = $result->fetch_assoc();
			$code = $row['code'];
		}
		else {$code = -1;}
		$query->close();
		$mysqli->close();
		return $code;
	}
	function mergeErrors($data){
		$codeFrom = getCode($data->from);
		$codeTo = getCode($data->to);
		if ($codeFrom!==-1 && $codeTo!==-1){
			$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$query = $mysqli->prepare("UPDATE errorLog SET common = ?, code = ? WHERE code = ?");
			$tmp = "iss";
			$query->bind_param($tmp, $data->to, $codeTo, $codeFrom);
			$query->execute();
			$query->close();
			$mysqli->close();
			return array('result'=>true);
		}
		else {
			return array('result'=>false);
		}
	}
	function getErrorData($data){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$query = $mysqli->prepare("
			SELECT id,time, userid, OS, browser, browserVer, s.code, status, screen, mobile, instances, latest, lowest, newest
			FROM errorLog s
			INNER JOIN (
				SELECT code, COUNT(code) AS instances, MAX(time) AS latest, MIN(status) AS lowest, MAX(id) as newest
				FROM errorLog t
				GROUP BY t.code) AS t
			ON s.code  = t.code
			WHERE common=-1 AND lowest=?
			ORDER BY newest DESC
			");
		$tmp = "i";
		$query->bind_param($tmp, $data->status);
		$query->execute();
		$result = $query->get_result();
		$outp = [];
		while ($row = $result->fetch_assoc()){
			$x = $row;
			$x['list'] = getInstanceIds($x['code']);
			$outp[] = $x;
		}
		$query->close();
		$mysqli->close();
		return $outp;
	}
	function createErrorLogFile($data, $id){
		$fname = __DIR__ ."/../".ERROR_DIR."/".$id.'.error';
		$x = file_put_contents($fname, json_encode($data, true));
		//echo ("Done: ".$x." ".$fname);
	}

	$data = json_decode(file_get_contents("php://input"));
	if (isset($data->action)){
		switch($data->action){
			case 'NEW':
				echo json_encode(writeNewError($data),true);
				break;
			case 'GET_UNIQUE':
				echo json_encode(getErrorData($data),true);
				break;
			case 'GET_TYPES':
				echo json_encode(ERROR_STAT,true);
				break;
			case 'NEW_STATUS':
				changeStatus($data);
				break;
			case 'MERGE':
				echo json_encode(mergeErrors($data),true);
				break;
		}
	}
?>
