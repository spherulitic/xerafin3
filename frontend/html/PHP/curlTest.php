<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include_once (__DIR__ ."/../PHP/config.php");

class tournamentFetch {
	private $url;
	private $data;
	private $lastWrite;
	private $roundsPlayed;
	private $pathCheckCode = 200;
	private function fetchRemote(){
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $this->url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$this->data = curl_exec($ch);
		curl_close($ch);
	}
	private function fetchLocal(){
		$fname = __DIR__ ."/../events/".$this->url;
		$y = file_get_contents($fname);
		$this->data = $y;
	}
	private function tshToJSON(){
		$this->data = str_replace("newt=","", $this->data);
		$this->data = str_replace("undefined", "[]", $this->data);
		$this->data = str_replace(";","", $this->data);
		$this->data = json_decode($this->data);
		unset($this->data->esb);
		unset($this->data->profile);

		$x = $this->data->config;
		$y = array(
			'currency_symbol'=>$x->currency_symbol,
			'event_date'=>$x->event_date,
			'event_name'=>$x->event_name,
			'max_rounds'=>$x->max_rounds,
			'prize_bands'=>$x->prize_bands,
			'rating_system'=>$x->rating_system
		);
		$this->data->config = $y;
	}
	private function getRemoteUpdateTime(){
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $this->url);
		curl_setopt($ch, CURLOPT_NOBODY, true);
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_FILETIME, true);
		$data = curl_exec($ch);
		$info = curl_getinfo($ch);
		$this->lastWrite = $info['filetime'];
	}
	public function validateRemotePath(){
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $this->url);
		curl_setopt($ch, CURLOPT_NOBODY, true);
		$data = curl_exec($ch);
		$this->pathCheckCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		if ($this->pathCheckCode!==200){
			return false;
		}
		return true;

	}
	private function getLocalUpdateTime(){
		$this->lastWrite = filemtime(__DIR__ ."/../events/".$this->url);
	}
	private function validateLocalPath(){
		if (file_exists(__DIR__ ."/../events/".$this->url)){
			return true;
		}
		else {
			$this->pathCheckCode = "404";
			return false;
		}
	}
	private function getRoundsPlayed(){
		$z = 0;
		foreach ($this->data->divisions as $div){
			foreach ($div->players as $play){
				if (isset($play->scores)){
					$x = count($play->scores);
					if ($x>$z) {$z=$x;}
				}
			}
		}
		$this->roundsPlayed = $z;
	}
	public function testOutput(){
		echo '<pre>';
		print_r(json_encode($this->data,JSON_PRETTY_PRINT));
		echo '</pre>';
	}
	function __construct($data){
		if (isset($data->url)){
			$this->url = $data->url;
			$y = preg_match('/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/',$this->url);
			echo $y."<br>";
			if ($y===1)
			{

				$x = $this->validateRemotePath();
			}
			else {
				$x = $this->validateLocalPath();
			}
			if ($x){
				if ($y){
					$this->getRemoteUpdateTime();
					$this->fetchRemote();
				}
				else {
					$this->getLocalUpdateTime();
					$this->fetchLocal();
				}
				$this->tshToJSON();
				$this->data->lastUpdate = $this->lastWrite;
				$this->getRoundsPlayed();
				$this->data->maxr = $this->roundsPlayed;
			}
			$this->data->HTTPStatus = $this->pathCheckCode;
		}
	}
}

//Testing Stuff
$data = (object)[];
//$data->url ="https://centrestar.co.uk/tsh/18Continental/html/tourney.js";
//$data->url = "https://events.xerafin.net/HRO2019/html/tourney.js";
$data->url = "HRO2019/html/tourney.js";
$test = new tournamentFetch($data);
$test->testOutput();

?>
