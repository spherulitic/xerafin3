<?php
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header("Connection: keep-alive");

function sendMsg($id, $msg) {
echo "retry: 5000" . PHP_EOL;
  echo "id: $id" . PHP_EOL;
  echo "data: $msg" . PHP_EOL;
  echo PHP_EOL;
  ob_flush();
  flush();
}

$serverTime = time();
sendMsg($serverTime, 'server time: ' . date("h:i:s", time()));

while (1) {
	$x = time();
	if (date("h:i:s", $x) !== date("h:i:s",$serverTime)){
		sendMsg($x, 'server time: ' . date("h:i:s", time()));
		$serverTime = time();
		usleep(700000);
	}
	else {
		usleep(100000);
	}
}
