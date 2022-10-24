<?php
	session_start();
	$x = array (
			'expires' => time() - 86400,
			'path' => '/',
			'domain' => '.xerafin.net',
			'secure' => true,     // or false
			'httponly' => true,    // or false,
		//	'samesite' => 'Strict' // None || Lax  || Strict
		);
	setcookie('XSESSID', "", 1, "/", ".xerafin.net");
	$y = array (
			'expires' => time() + 86400,
			'path' => '/',
			'domain' => 'www.xerafin.net',
			'secure' => true,     // or false
			'httponly' => true
		);
		//,    // or false 'samesite' => 'Strict' // None || Lax  || Strict
	setcookie('XTEST', "TEST", $y);
	session_destroy();
	header ('Location: http://www.xerafin.net/');
?>
