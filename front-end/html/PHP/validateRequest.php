<?php
	//Session stuff if here incase we want to do different checks later
	session_start();
	session_commit();

	//lookup table, frequency is for a later dice roll out of 1000 as to whether or not to run the validation
	$targetArr = array (
		array (
			'Short' => 'submitChat',
			'File' => 'submitChat.py',
			'Path' => $_SERVER["DOCUMENT_ROOT"].'/xerafin/',
			'Frequency' => 1000
		)
	);
	//Take an aJAX request from javaScript
	if (isset($_REQUEST['d']){
		//decode and take the necessary information (userid, token, shortname of file) from the JSON
		$data= json_decode($_REQUEST['d']);
		if (isset($data->token)){
			$token=$data->token;
		}
		else {
			echo "No token sent";
			die;
		}
		if (isset($data->userid)){
			$userid=$data->userid;
		}
		else {
			echo "No FB ID Sent";
			die;
		}
		if (isset($data->target)){
			$target=$data->target;

			//find the shortname of the file in the array.  Roll random vs frequency.
			$key = array_search($target, array_column($targetArr, 'Short'));

			if ((mt_rand(1,1000) <= $targetArr[$key]['Frequency']) {

				//If within frequency max:
				//access the DB via Python, sending (userid) and return the stored token value
				$pycheck = array ('userid' => $userid);
				$result = json_decode(shell_exec('python '.$_SERVER["DOCUMENT_ROOT"].'/xerafin/getToken.py'. escapeshellarg(json_encode($pycheck))));

				//compare the values - if match, forward json to python and output result.
				if ($result->{'token'}!==$token){

					//eventually log a record of this in a db table and automate ip blocking methods if felt necessary.
					die;
				}
			}
			//Forwards the request to the appropriate file, gets the returned data and forwards it back to the browser
			$output = shell_exec('python '.$targetArr[$key]['Path'].$targetArr[$key]['File']. escapeshellarg(json_encode($_REQUEST['d'])));
			echo $output;
			die;
		}
		else {
			echo "No Target file specified";
			die;
		}
	}

?>
