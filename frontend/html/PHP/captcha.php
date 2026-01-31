<?php
	$captcha;
	$data = json_decode(file_get_contents("php://input"),false);
	if (isset($data->captcha) ) {
		$captcha = $data->captcha;
	}
	if( !$captcha ){
		$response = array (
			'status' => 'error',
			'msg' => 'Please check the the captcha form.'
		);
		echo json_encode($response);
		exit;
	}
	$secretKey = "6Lc0SKsZAAAAAPRIumWG7JZfUXxF8SsKcdbLUPM2";
	$ip = $_SERVER['REMOTE_ADDR'];
	$googleResponse =  file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret=".$secretKey."&response=".$captcha."&remoteip=".$ip);
	$responseKeys = json_decode($googleResponse,true);

	if(intval($responseKeys["success"]) !== 1) {
		$response = array (
			'verified' => false,
			'msg' => 'Incorrect Response.'
		);
		echo json_encode($response);
		exit;
	}
	else {
		$response = array (
			'verified' => true,
			'msg' => "Recaptcha Verified."
		);
		echo json_encode($response);
		exit;
	}
?>
