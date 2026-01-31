<?php
	include_once (__DIR__ ."/../PHP/config.php");
	//ini_set('display_errors', 1);
	//ini_set('display_startup_errors', 1);
	//error_reporting(E_ALL);
	class authorize {
		private $sql;
		private $query;
		private $handle;
		private $rParams;
		private $flag;
		private $msg = "";
		private $xid = -1;
		private function generateRandomString(){
		return bin2hex(openssl_random_pseudo_bytes(20));
		}
		private function writeLexicon(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "
			INSERT INTO user_lexicon_master
			(userid, lexicon, version)
			VALUES (?,?,?)";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param(
					"iiiiisisiiisis",
					$this->xid, "CSW", 19
				);
				$stmt->execute();
			}
		}
		private function writePrefs(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "
			INSERT INTO user_prefs
			(id, studyOrderIndex, closet, newWordsAtOnce,
			reschedHrs, showNumSolutions, cb0max, showHints,
			schedVersion, secLevel, isTD, firstLogin,
			countryId, lexicon)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param(
					"iiiiisisiiisis",
					$this->xid, 0, 20, 100, 24, "Y", 200, "N", 0, 1, 0, 0, 0, "csw"
				);
				$stmt->execute();
			}
		}
		private function writeAuth(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "
			INSERT INTO user_auth
			(password,firstname,lastname,handle,photo,email,ext_ref,active,first_login,use_handle,tos_agree,privacy_agree)
			VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param(
					"sssssssiiiss",
					$this->rParams['password'],$this->rParams['firstname'],$this->rParams['lastname'],$this->rParams['handle'],
					"images/unknown_player.gif",$this->rParams['email'],$this->generateRandomString(),1,
					0,1,$this->rParams['tos_agree'],$this->rParams['tos_agree']
				);
				$stmt->execute();
			}
		}
		private function getXid(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "SELECT xid FROM user_auth WHERE handle = ? LIMIT 1";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("s", $this->handle);
				$stmt->execute();
				$result = $stmt->get_result();
				if ($result->num_rows >0){
					$row=$result->fetch_assoc();
					$this->xid=$row['xid'];
				}
			}
		}
		private acceptEmail(){
			$to_email = $this->rParams['eMail'];
			$subject = 'Your account is ready to use.';
			$headers = "From: Xerafin<no-reply@xerafin.net>\r\n";
			$headers.= 'MIME-Version: 1.0' . "\r\n";
			$headers.= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
			$headers.= "Reply-To: Xerafin <no-reply@xerafin.net>"."\r\n";
			$headers .= "X-Priority: 3\r\n";
			$headers .= "X-Mailer: PHP". phpversion() ."\r\n";
			$message = "";
			if (strlen($this->rParams['firstName'])>0) {
				$message .= "Hi ".$this->params['firstName'].",<br><br>";
			}
			$message .= "Your request to join Xerafin has been approved and you can now log in.<br><br>";
			$message .= "Woohoo!<br><br><img width='80' height='80' src='https://www.xerafin.net/images/xerafin2.png'><br><br>Team Xerafin.";
			mail($to_email,$subject,$message,$headers);
		}
		private function getAuthReady(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "SELECT * FROM user_ready WHERE handle = ? LIMIT 1";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("s", $this->handle);
				$stmt->execute();
				$result = $stmt->get_result();
				if ($result->num_rows >0){
					$row=$result->fetch_assoc();
					$this->rParams = $row;
				}
			}
		}
		private function removeAuthReady(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "DELETE * FROM user_ready WHERE handle = ? LIMIT 1";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("s", $this->handle);
				$stmt->execute();
			}
		}
		private function createAccount(){
			$this->writeAuth();
			$this->getXid();
			if ($this->xid!==-1){
				$this->writePrefs();
				$this->writeLexicon();
				$this->acceptEmail();
				$this->removeAuthReady();
			}
		}
		private function rejectionEmail(){
			$to_email = $this->rParams['eMail'];
			$subject = 'Your account request has been rejected.';
			$headers = "From: Xerafin<no-reply@xerafin.net>\r\n";
			$headers.= 'MIME-Version: 1.0' . "\r\n";
			$headers.= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
			$headers.= "Reply-To: Xerafin <no-reply@xerafin.net>"."\r\n";
			$headers .= "X-Priority: 3\r\n";
			$headers .= "X-Mailer: PHP". phpversion() ."\r\n";
			$message = "";
			if (strlen($this->rParams['firstName'])>0) {
				$message .= "Hi ".$this->params['firstName'].",<br><br>";
			}
			$message .= "Your request to join Xerafin has been rejected on the following grounds:<br><br>";
			$message .=$this->msg."<br><br>";
			$message .= "Should you still wish to join Xerafin you will have to register again.";
			$message .= "Best wishes,<br><br><img width='80' height='80' src='https://www.xerafin.net/images/xerafin2.png'><br><br>Team Xerafin.";
			mail($to_email,$subject,$message,$headers);
		}

		private function rejectAccount(){
			$this->rejectionEmail();
			$this->removeAuthReady();
		}
		private function __construct($handle,$flag,$msg=''){
			$this->handle = $handle;
			$this->getAuthReady();
			$this->msg = $msg;
			$flag ? $this->createAccount() : $this->rejectAccount();
		}
	}

	if ($_SESSION['PRIV_LEVEL']>59){
		$x = new authorize( );
	}
?>
