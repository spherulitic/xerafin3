<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
include_once('sloth.class.php');
$data = json_decode(file_get_contents("php://input"), true);
$x = new Sloth($data['action'], $data);
