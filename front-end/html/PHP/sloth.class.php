<?php
include_once('config.php');
session_start();
class Sloth {
	private $startTime;
	private $user;
	private $alpha;
	private $lexicon;
	private $token;
	private $sql;
	private $activeData;
	private $query;
	private $userRank;
	private $username;
	private function createToken() {
		return bin2hex(openssl_random_pseudo_bytes(20));
	}
	private function writeActive() {
		$token = $this->createToken();
		$x = microtime(true);
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "INSERT INTO sloth_active (userid, alphagram, date, start_time, token,lex) VALUES (?,?,NOW(),?,?,?)";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("ssdss", $this->user, $this->alpha, $x , $token, $this->lexicon);
			$stmt->execute();
			echo json_encode(array('token'=> $token),true);
		}
		$stmt->close();
		$this->sql->close();
	}
	private function submitSlothChat(){
		$this->getUserName();
		$this->correct>="100" && $this->accuracy>="100" ? $x = " with a perfect score!" : $x = ".";
		$statement = "[".$this->lexicon."] ".$this->username." has set a new record in Subword Sloth for ".$this->alpha.$x." <a href ='#' onclick='initSloth(\"".$this->alpha."\",\"".$this->lexicon."\")'>Click here</a> to try it yourself!";
		$path = CURL_RT."submitChat.py";
		$ch = curl_init($path);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array('userid'=>'1', 'chatText'=>$statement,'chatTime' => round(microtime(true),3)*1000),true));
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$result = curl_exec($ch);
		if ($errno = curl_errno($ch)) {
			$errorM = curl_strerror($errno);
			echo $errorM;
		}
		curl_close($ch);
	}
	private function getRank(){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "SELECT * FROM sloth_completed WHERE alphagram = ? AND lex = ? ORDER BY correct DESC, accuracy DESC, time_taken ASC";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("ss", $this->alpha, $this->lexicon);
			$stmt->execute();
			$result = $stmt -> get_result();
			$found = false;
			$rank = 0;
			if ($result->num_rows >0){
				while ($row = $result->fetch_assoc()) {
					$rank++;
					if ($this->token === $row['token']) {
						$found = true;
						return $rank;
					}
				}
				if (!$found) {
					return 0;
				}
			}
			else {
				return 0;
			}
		}
		$stmt->close();
		$this->sql->close();
	}
	private function getActive(){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "SELECT * FROM sloth_active WHERE userid = ? AND alphagram = ? AND token = ?";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("sss", $this->user, $this->alpha, $this->token);
			$stmt->execute();
			$result = $stmt -> get_result();
			if ($result->num_rows >0){
				$this->activeData = $result->fetch_assoc();
				//echo json_encode($this->activeData);
			}
			else {
				//This shouldn't happen. needs handler
			}
		}
		$stmt->close();
		$this->sql->close();
	}
	private function deleteActive(){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "DELETE FROM sloth_active WHERE userid = ? AND alphagram = ? AND token = ?";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("sss", $this->user, $this->alpha, $this->token);
			$stmt->execute();
		}
		$stmt->close();
		$this->sql->close();
	}
	private function getUserName(){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "SELECT firstname, lastname FROM login WHERE userid=?";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("s", $this->user);
			$stmt->execute();
			$result = $stmt->get_result();
			$row = $result->fetch_assoc();
			$x = ((strlen($row['firstname'])==0) || (strlen($row['lastname'])==0)) ? "":" ";
			//echo strlen($row['firstname'])." - ".strlen($row['lastname'])." - ".strlen($x);
			$this->username = $row['firstname'].$x.$row['lastname'];
			$stmt->close();
		}
		$this->sql->close();
	}
	private function writeCompleted() {
		$end = microtime(true);
		$this->getActive();
		$timeTaken = $end - $this->activeData['start_time'];
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "INSERT INTO sloth_completed (userid, alphagram, time_taken, correct, accuracy, date, token, lex) VALUES (?,?,?,?,?,NOW(),?,?)";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("ssdddss", $this->user,$this->activeData['alphagram'], $timeTaken, $this->correct, $this->accuracy, $this->token, $this->lexicon);
			$stmt->execute();
			$stmt->close();
			$x = $this->getRank();
			echo json_encode(array('time'=>round($timeTaken,3)*1000, 'rank'=>$x));
			if ($this->correct>50) {
				if ($x === 1) {$this->submitSlothChat();}
			}
		}
		else {echo "STATEMENT ERROR";}
		//$this->sql->close();
		$this->deleteActive();
	}
	private function getStats() {
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "
			SELECT COUNT(DISTINCT alphagram) AS uAttempts, COUNT(alphagram) AS tAttempts
			FROM sloth_completed
			WHERE userid = ? AND date = CURDATE()
			";
		$stmt = $this->sql->prepare($this->query);
		$stmt->bind_param("s", $this->user);
		$stmt->execute();
		$result = $stmt->get_result();
		$row = $result->fetch_assoc();
		$output = $row;
		$stmt->close();
		$this->query = "
			SELECT COUNT(DISTINCT alphagram) AS uComplete, COUNT(alphagram) AS tComplete
			FROM sloth_completed
			WHERE userid = ? AND date = CURDATE() AND correct>=100
			";
		$stmt = $this->sql->prepare($this->query);
		$stmt->bind_param("s", $this->user);
		$stmt->execute();
		$result = $stmt->get_result();
		$row = $result->fetch_assoc();

		$output['uComplete'] = $row['uComplete'];
		$output['tComplete'] = $row['tComplete'];
		$stmt->close();
		$this->query = "
			SELECT COUNT(DISTINCT alphagram) AS uPerfect, COUNT(alphagram) AS tPerfect
			FROM sloth_completed
			WHERE userid = ? AND date = CURDATE() AND correct>=100 AND accuracy>=100
			";
		$stmt = $this->sql->prepare($this->query);
		$stmt->bind_param("s", $this->user);
		$stmt->execute();
		$result = $stmt->get_result();
		$row = $result->fetch_assoc();
		$output['uPerfect'] = $row['uPerfect'];
		$output['tPerfect'] = $row['tPerfect'];
		$stmt->close();
		$this->sql->close();
		echo json_encode($output);
	}
	private function getAlphaRankings(){
		$rank = 0;
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "SELECT userid, firstname, lastname, photo, countryId, time_taken, correct, accuracy, date, lex
		FROM sloth_completed
		JOIN login
		USING (userid)
		JOIN user_prefs
		USING (userid)
		WHERE alphagram = ? AND lex = ?
		ORDER BY correct DESC, accuracy DESC, time_taken ASC LIMIT 5";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("ss", $this->alpha, $this->lexicon);
			$stmt->execute();
			$result = $stmt->get_result();
			$op = [];
			while ($row = $result -> fetch_assoc()){
				$rank++;
				$x = array(
					'rank'=>$rank,
					'name'=>$row['firstname']." ".$row['lastname'],
					'photo'=>$row['photo'],
					'countryId'=>$row['countryId'],
					'time'=>$row['time_taken'],
					'correct'=>$row['correct'],
					'accuracy'=>$row['accuracy'],
					'date'=>$row['date']
				);
				if ($this->user == $row['userid']){
					$x['isMe'] = true;
				}
				$op[] = $x;
			}
			echo json_encode($op,true);
		}
	}
	function __construct($action, $data){
		//print_r ($data);
		//$data['user'] = 1080;
		if ($data['user'] == -1){
			$this->user = getUseridFromXerfSess($_COOKIE['XSESSID']);
		}
		else {
			$this->user = $data['user'];
		}
		switch ($action) {
			case "GET_STATS":
				$this->getStats();
				break;
			case "GET_RANKINGS":
				$this->alpha = $data['alpha'];
				$this->lexicon = $data['lexicon'];
				$this->getAlphaRankings();
				break;
			case "WRITE_ACTIVE":
				$this->alpha = $data['alpha'];
				$this->lexicon = $data['lexicon'];
				$this->writeActive();
				break;
			case "ABORT_ACTIVE":
				$this->alpha = $data['alpha'];
				$this->token = $data['token'];
				$this->deleteActive();
				break;
			case "WRITE_COMPLETED":
				$this->alpha = $data['alpha'];
				$this->token = $data['token'];
				$this->lexicon = $data['lexicon'];
				$this->correct = $data['correct'];
				$this->accuracy = $data['accuracy'];
				$this->writeCompleted();
				break;
		}
	}
}
?>
