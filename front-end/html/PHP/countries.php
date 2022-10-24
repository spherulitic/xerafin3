<?php
	include_once ($_SERVER["DOCUMENT_ROOT"]."/PHP/config.php");
	function outputCountries($val){
		switch ($val) {
			case 0 : $query = 'SELECT countryid, name, short from countries order by countryid ASC';break;
			case 1 : $query = 'SELECT countryid, name, short from countries order by name ASC';break;
			case 2 : $query = 'SELECT countryid ,name ,short, count(distinct countryId) as most from countries, user_prefs
			WHERE countryid=countryId GROUP BY countryid ORDER BY most DESC, LIMIT 5';break;
		}
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$result = $mysqli->query($query);
		$x = [];
		while ($row = $result->fetch_assoc()){
			switch ($val) {
				case 0:	$x[] =  array('name' => $row['name'], 'short' => $row['short']);break;
				case 1:	$x[] =  array('id' => $row['countryid'], 'name' => $row['name'], 'short' => $row['short']);break;
				case 2: $x[] =  array('id' => $row['countryid'], 'name' => $row['name'], 'short' => $row['short']);break;
			}
		}
		return $x;
	}
	echo json_encode(array("byId" => outputCountries(0), "byName" => outputCountries(1)),true);
?>
