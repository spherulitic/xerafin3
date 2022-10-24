<?php
	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	include_once ("PHP/config.php");
	class eConfirm {
		private $sql;
		private $value;
		private $params;
		private $found = false;
		private function deleteToken(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "DELETE FROM user_verification WHERE token = ?";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("s", $this->value);
				$stmt->execute();
				$stmt->close();
			}
			$this->sql->close();
		}
		private function getToken(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "SELECT * FROM user_verification WHERE token = ? LIMIT 1";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("s", $this->value);
				$stmt->execute();
				$result = $stmt->get_result();
				if ($result->num_rows >0){
					$this->params=$result->fetch_assoc();
					$this->found=true;
				}
				else {$this->found=false; }
				$stmt->close();
			}
			$this->sql->close();
		}
		private function readyAuth(){
			$this->sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
			$this->query = "INSERT INTO user_ready (firstname,lastname,handle,email,tos_agree,comments,password) VALUES (?,?,?,?,?,?,?)";
			if ($stmt = $this->sql->prepare($this->query)){
				$stmt->bind_param("sssssss", $this->params['firstname'], $this->params['lastname'],$this->params['handle'],$this->params['email'],$this->params['tos_agree'],$this->params['comments'],$this->params['password']);
				$stmt->execute();
				$stmt->close();
			}
			$this->sql->close();
		}
		public function returnParams(){
			return $this->params;
		}
		public function returnState(){
			return $this->found;
		}
		function __construct($value){
			$this->value = $value;
			$this->getToken();
			if ($this->found == true){
				$this->deleteToken();
				$this->readyAuth();
			}
		}
	}
	if (isset($_GET['id'])){
		$x = new eConfirm($_GET['id']);
		$resp = $x->returnState();
	}
	else {
		$resp = false;
	}
	if ($resp==true){ $y = "Your eMail account has been verified.<br>You will be notified by eMail once your account is ready.";}
	else { $y = "Verification code seems to have expired.<br>eMail account cannot be verified.<br>Please re-register.";	}
?>
<html>
	<head>
		<link async rel="stylesheet" href="vendor/bootstrap/css/bootstrap.css">
		<link async rel="stylesheet" href="vendor/bootstrap/css/bootstrap-theme.min.css">
		<link async rel="stylesheet" href="vendor/font-awesome/css/fontawesome.css">
		<link async rel="stylesheet" href="vendor/font-awesome/css/solid.css">
		<link async rel="stylesheet" href="vendor/font-awesome/css/regular.css">
		<link async rel="stylesheet" href="vendor/font-awesome/css/brands.css">
		<script src="vendor/bootstrap/js/bootstrap.min.js"></script>
		<link async href="styles/styles.css?v=<?php echo filemtime('styles/styles.css');?>" rel="stylesheet" type="text/css" />
	</head>
	<body style='width:100%;text-align:center;height:95vh;'>
		<div style='margin:auto;width:min(600px, 90%);display:table;height:95vh;'>
			<div class='frontPage' style='height:250px;margin:auto!important;color:rgb(230,230,200);padding:5px;font-family:Lato,sans-serif;display:table-cell;vertical-align:middle;'>
				<img src="images/xerafinNew.png" style='height:80px'>
				<div style='font-size:1.1em;margin-top:10px;'>
					<?php echo $y; ?>
				</div>
			</div>
		</div>
	</body>
</html>
