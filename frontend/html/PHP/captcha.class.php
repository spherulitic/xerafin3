<?php
class Captcha {
	private $secretKey;
	private $ip;
	private $captcha;
	private $output;
	private function verify_captcha() {
		$z = "https://www.google.com/recaptcha/api/siteverify?secret=".$this->secretKey."&response=".$this->captcha."&remoteip=".$this->ip;
		$googleResponse = file_get_contents($z);
		$responseKeys = json_decode($googleResponse,true);
		return ($responseKeys["success"]== 1);
	}
	public function send(){
		echo json_encode($this->output,true);
	}
	public function fetch(){
		return $this->output;
	}
	function __construct($in){
		$this-> secretKey = "6Lc0SKsZAAAAAPRIumWG7JZfUXxF8SsKcdbLUPM2";
		$this-> ip = $_SERVER['REMOTE_ADDR'];
		$this->captcha = $in;
		$y = array( 'verified' => $this->verify_captcha() );
		$this->output = $y;
	}
}
?>
