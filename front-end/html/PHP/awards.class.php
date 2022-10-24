<?php

	include_once ($_SERVER["DOCUMENT_ROOT"]."/PHP/config.php");

	class Awards {
		private $userid = -1;
		private $pageSize = 10;
		private $pageNumber = 1;
		private $pageTotal;
		private $page;
		private $displayType = 0;
		private $offset = 0;
		private $userCount = 0;
		private $userRank = -1;
		private $inData = [];
		private $outData = [];
		private $year = 0;
		private $type = 0;
		private $output;

		private function readSource(){
			if ($this->type===1) {$file='awardsMost';}
			if ($this->type===0) {$file='awardsTop';}
			if ($this->year===0) {$file.='.JSON';}
			else {$file.="_".$this->year.'.JSON';}
			$fname = __DIR__ ."/../JSON/rankings/".$file;
			$y = file_get_contents($fname);
			$this->inData = json_decode($y,true);
		}

		private function getRankingBounds(){
			if ($this->displayType === 1){
				$bound = $this->pageSize;
				if ($bound % 2 == 0) {$this->pageSize++;}
				if ($bound % 2 !== 0) {$bound--;}
				$bounds = $bound/2;
				$this->offset = $this->userRank - $bounds -1;
				if ($this->offset < 0) {$this->offset = 0;}
				if ($this->userRank + $bounds > $this -> userCount) {
					$this->offset = $this->userCount - $this->pageSize;
				}
				if ($this->offset < 0) {$this->offset = 0;}
				$this->pagetotal = 1;
				$this->page = 1;
			}
			else {
				$this->pageTotal = ceil($this->userCount / $this->pageSize);
				if ($this->pageTotal===0){$this->pageTotal=1;}
				$this->page = min($this->pageNumber-1,$this->pageTotal);
				$this -> offset = $this->pageSize*($this->page);
			}
		}
		private function findUserRank(){
			if ($this->userid!==-1){
				foreach ($this->inData['rankings'] as $row) {
				if ($row['id']==$this->userid) {$this->userRank = $row['rank'];return;}
				}
			}
			$this->userRank = -1;
		}

		public function getAwardsJSON(){
			echo json_encode($this->outData,true);
		}

		private function parseOutputParams($x){
			$d = array(0 => array('photo'=>$x['photo'], 'name'=>$x['name']));
			$outp = array('rank'=> $x['rank'], 'users'=>$d, 'countryId' => $x['countryId'], 'values'=> $x['values']);
			if (isset($x['isMe'])){$outp['isMe'] = 1;}
		return $outp;
		}
		private function extractData(){
			$userFound = 0;
			for ($v = $this->offset; ($v<($this->offset+$this->pageSize)&&($v<$this->userCount)); $v++){
				$x = $this->inData['rankings'][$v];
				if ($v == $this->userRank -1) {$x['isMe']=1;$userFound=1;}
				$w[] = $this->parseOutputParams($x);
			}
			if ($userFound===0){
				if ($this->userRank!==-1){
					$this->inData['rankings'][$this->userRank-1]['isMe'] = 1;
					if ($this->userRank < $this->offset){
						array_unshift($w,$this->parseOutputParams($this->inData['rankings'][$this->userRank-1]));
					}
					else {
						$w[] = $this->parseOutputParams($this->inData['rankings'][$this->userRank-1]);}
				}
			}
			$this->outData = (object) array('rankings'=>$w, 'users'=>$this->userCount, 'lastUpdate'=>$this->inData['lastUpdate'], 'page'=>$this->page+1);
		}

		private function findUserRankData(){
			if ($this->userRank!==-1){
			$x = $this->inData['rankings'][$this->rank-1];
			$y = array('rank'=> $x['rank'], 'name'=> $x['name'], 'photo'=> $x['photo'], 'values'=> $x['values'], 'user'=>1);
			if (isset($x['countryId'])){$y['countryId']=$x['countryId'];}
			return $y;
			}
		}
		private function getUserAmount(){
			$this->userCount = count($this->inData['rankings'],0);
		}

		function __construct($data){
			if (isset($data->year)){
				if (!is_int($data->year)){$this->year=0;}
				$datesample = date('Y',time() - (24*60*60));
				if (($data->year!==0) && ((($data->year<2018)) || ($data->year > $datesample))) {$this->year=0;}
				else {$this->year=$data->year;}
			}
			else {$this->year=0;}
			if (isset($data->userid)){$this->userid = $data->userid;}
			else {$this->userid = -1;}
			if (isset($data->type)){
				switch($data->type){
					case 'top': $this->type = 0;break;
					case 'most': $this->type = 1;break;
					default: $this-> type = 0;break;
				}
			}
			else {$this->type = 0;}

			if ((isset($data->pageSize)) && (is_int($data->pageSize)) && ($data->pageSize > 1) && ($data->pageSize <= 50)){
				$this->pageSize = $data->pageSize;
			}
			else {
				$this->pageSize = 10;
			}
			if ((isset($data->pageNumber)) && (is_int($data->pageNumber)) && ($data->pageNumber > 0)){
				$this->pageNumber = $data->pageNumber;
			}
			else {
				$this->pageNumber = 1;
			}
			if ((isset($data->displayType)) && (is_int($data->displayType)) && ($data->userid!==-1)){
				$this->displayType = $data->displayType;
			}
			else {
				$this->displayType = 0;
			}
			$this->readSource();
			$this->findUserRank();
			$this->getUserAmount();
			$this->getRankingBounds();
			$this->extractData();
		}
	}
?>
