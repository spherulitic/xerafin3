<?php
include_once ("config.php");
include_once ("captcha.class.php");
class Register {
	private $captcha;
	private $hasCaptcha;
	private $messages= [];
	private $params;
	private $parseError;
	private $query;
	private $sql;
	private $stmt;
	private function captchaTest(){
		$z = new Captcha($this->captcha);
		$x = $z->fetch();
		return $x['verified'] ? true:false;
	}
	private function checkHeaderInjection ($arr){
		foreach ($arr as $field) {
			if (preg_match("/[\r\n]/", $field)){return false;}
		}
		return true;
	}
	private function checkAttachmentInjection ($content){
		if (preg_match("/file=/i",$content)){return false;}
		if (preg_match("/http/i",$content)){return false;}
		if (preg_match("/www./i",$content)){return false;}
		return true;
	}
	private function writeVerify(){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "INSERT INTO user_verification (firstname,lastname,handle,email,token,tos_agree,expiry,comments,password) VALUES (?,?,?,?,?,NOW(),NOW()+INTERVAL 1 DAY,?,?);";
		if ($stmt = $this->sql->prepare($this->query)){
			$options = ['cost' => 12];
			$x = password_hash($this->params['password'], PASSWORD_BCRYPT, $options);
			$stmt->bind_param("sssssss", $this->params['firstName'], $this->params['lastName'], $this->params['handle'], $this->params['eMail'],$this->randomString, $this->params['comments'], $x);
			$stmt->execute();
			$stmt->close();
		}
		else {
			echo "ERROR!";
		}
		$this->sql->close();
	}
	private function sendConfirmMail(){
		$to_email = $this->params['eMail'];
		$subject = 'Registration request.';
		$headers = "From: Xerafin<no-reply@xerafin.net>\r\n";
		$headers.= 'MIME-Version: 1.0' . "\r\n";
		$headers.= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
		$headers.= "Reply-To: Xerafin <no-reply@xerafin.net>"."\r\n";
		$headers .= "X-Priority: 3\r\n";
		$headers .= "X-Mailer: PHP". phpversion() ."\r\n";
		$message = "";
		if (strlen($this->params['firstName'])>0) {
			$message .= "Hi ".$this->params['firstName'].",<br><br>";
		}
		$message .= "A request to join Xerafin has been sent to this eMail address.  Please follow the link below to confirm.<br><br>";
		$message .="<a href='https://".ENV.".xerafin.net/eConfirm.php?id=".$this->randomString."'>https://".ENV.".xerafin.net/eConfirm.php?id=".$this->randomString."</a><br><br>";
		$message .= "This link will be made available for around 24 hours.  If not be used within that time, this link will no longer work and you will have to register again. ";
		$message .= " It may take a day to review your info and activate your account.  Most of the time, this is done within a few hours.";
		$message .= "<br><br>We will notify you with by eMail once your account is ready.<br><br>";
		$message .= "See you soon,<br><br><img width='80' height='80' src='https://www.xerafin.net/images/xerafin2.png'><br><br>Team Xerafin.";
		mail($to_email,$subject,$message,$headers);
	}
	private function generateRandomString(){
		$this->randomString = bin2hex(openssl_random_pseudo_bytes(20));
	}
	private function existence($param, $errorMsg){
		if (!isset($this->params[$param])){
			$this->parseError=true;
			$this->messages[] = array('scope'=>$param, 'msg'=>$errorMsg);
			return false;
		}
		else {
			return true;
		}
	}
	private function SQLChecks($table, $field, $value, $scope, $err){
		$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$this->query = "SELECT ".$field." FROM ".$table." WHERE ".$field." = ?";
		if ($stmt = $this->sql->prepare($this->query)){
			$stmt->bind_param("s", $value);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($result->num_rows > 0){
				$this->parseError = true;
				$this->messages[] = array('scope'=>$scope,'msg'=>$err);
			}
			$stmt->close();
		}
		else {echo "SELECT ERROR<br>";echo $this->query;}
		$this->sql->close();
	}
	private function parseParams(){
		unset($this->params['captcha']); // Remove captcha from the list of params as it's no longer relevant
		if ($this->existence('eMail', 'eMail field is missing.')) {
			$this->params['eMail'] = strtolower($this->params['eMail']);
			if (!filter_var($this->params['eMail'], FILTER_VALIDATE_EMAIL)){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'eMail','msg'=>'Invalid eMail format.');
			}
			else {
				$this->SQLChecks("user_auth", 'email', $this->params['eMail'], 'eMail', "An account already exists with this eMail address.");
				$this->SQLChecks("user_verification", 'email', $this->params['eMail'], 'eMail', 'An account already exists with this eMail address [awaiting user verification].');
				$this->SQLChecks("user_ready", 'email', $this->params['eMail'], 'eMail', "An account already exists with this eMail address [awaiting approval by admin].");

			}
		}
		if ($this->existence('password', 'Password field is missing.')) {
			if (!preg_match("/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/", $this->params['password'])){
				$this->parseError = true;
				$this->messages[] =array('scope'=>'password','msg'=>'Password is not strong enough! See rules.');
			}
		}
		if ($this->existence('passwordConfirm', 'Password Confirm field is missing')) {
			if (($this->params['passwordConfirm'])!==($this->params['passwordConfirm'])){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'passwordConfirm','msg'=>'Passwords field does not match!');
			}
		}
		if ($this->existence('handle', 'Handle field is missing.')) {
			if (!preg_match("/^[A-Za-z_-]{4,15}$/", $this->params['handle'])){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'handle','msg'=>'Invalid handle format.  See rules.');
			}
			else {
				$x = ucwords(strtolower($this->params['handle']));
				$this->params['handle'] = $x;
				$msg = "This handle is already in use.  Please choose another.";
				$this->SQLChecks("user_auth", 'handle', $this->params['handle'], 'handle', $msg);
				$this->SQLChecks("user_verification", 'handle', $this->params['handle'], 'handle', $msg);
				$this->SQLChecks("user_ready", 'handle', $this->params['handle'], 'handle', $msg);
			}
		}
		if ($this->existence('firstName', 'Firstname field is missing.')) {
			if (strlen($this->params['firstName'])>20){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'firstName','msg'=>'Name is greater than 20 characters long.');
			}
			else {
				$this->params['firstName'] = ucwords(strtolower($this->params['firstName']));
			}
		}
		if ($this->existence('lastName', 'Lastname field is missing.')){
			if (strlen($this->params['lastName'])>20){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'lastName','msg'=>'Name is greater than 20 characters long.');
			}
			else {
				$this->params['lastName'] = ucwords(strtolower($this->params['lastName']));
			}
		}
		if ($this->existence('comments', 'Comments field is missing.')){
			$this->params['comments'] = nl2br(substr($this->params['comments'],0,255));
		}
		if ($this->existence('privacyCheck', 'Privacy/Tos agreement is missing.')){
			if (!$this->params['privacyCheck']){
				$this->parseError = true;
				$this->messages[] = array('scope'=>'privacyCheck','msg'=>'You must agree to our Privacy Policy and Terms of Service.');
			}
		}
	}
	public function send(){
		if ($this->parseError) {
			$x = $this->messages;
			$y = array ('messages'=>$x, 'registered'=>false, 'eMail'=>$this->params['eMail']);
			return json_encode($y,true);
		}
		else {
			$y = array ('registered'=>true);
			$this->generateRandomString();
			$this->writeVerify();
			$this->sendConfirmMail();
			return json_encode($y,true);
		}
	}
	function __construct($data,$hasCaptcha) {
		$this->parseError = false;
		$this->messages = [];
		$this->hasCaptcha = $hasCaptcha;
		$x = isset($data['captcha']);
		if ($hasCaptcha) {
			if ($x){
				$this->captcha = $data['captcha'];
				if ($this->captchaTest()){
					$this->params = $data;
					$this->parseParams();
				}
				else {
					$this->parseError = true;
					$this->messages[] = array('scope'=>'captcha','msg'=>'reCaptcha not completed.');

				}
			}
			else {
				if (isset($data['hasNull'])){
					$this->parseError = true;
					$this->messages[] = array('scope'=>'captcha','msg'=>'No reCaptcha activity detected');
				}
				else {
					$this->parseError = true;
					$this->messages[] = array('scope'=>'general','msg'=>'Stop tampering with our stuff!');
				}
			}

		}
		else {
			$this->params = $data;
			$this->parseParams();
		}

	}

}
?>
