<?php
function getUseridFromXerfSess($sessid){
	$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
	$sql = "SELECT userid FROM login WHERE token = '".$sessid."'";
	$result = $mysqli->query($sql);
	$rows = $result->fetch_assoc();
	$_SESSION['USER_ID'] = $rows['userid'];
	return $rows['userid'];
}

function utf8ize($mixed) {
    if (is_array($mixed)) {
        foreach ($mixed as $key => $value) {
            $mixed[$key] = utf8ize($value);
        }
    } else if (is_string ($mixed)) {
        return utf8_encode($mixed);
    }
} // converts to utf8

?>
