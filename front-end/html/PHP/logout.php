<?php
require_once ($_SERVER["DOCUMENT_ROOT"].'/vendor/facebook/autoload.php' );
require_once ('config.php');
session_start();
session_destroy();
	$fb = new Facebook\Facebook([
	'app_id'                => 'FB_APP_ID',
	'app_secret'            => 'FB_APP_SECRET',
	'default_graph_version' => 'FB_APP_VERSION'
	]);
	//$fb->destroySession();
?>
