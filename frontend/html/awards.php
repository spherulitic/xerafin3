<?php
	include ($_SERVER["DOCUMENT_ROOT"]."/PHP/config.php");
	session_start();

	function readCoins($type,$year){
		if ($type==1) {$file='awardsMost';}
		if ($type==0) {$file='awardsTop';}
		if ($year==0) {$file=$file.'.JSON';}
		else {$file=$file."_".$year.'.JSON';}
		$fname = __DIR__ ."/../JSON/rankings/".$file;
		$y = file_get_contents($fname);
		return json_decode($y,true);
	}

	function extractCoinData($data,$start,$end,$user){
		$userFound=0;
		foreach ($data['rankings'] as $row) {
			$x = array('rank'=>$row['rank'], 'name'=> $row['name'], 'photo'=> $row['photo'], 'values'=> $row['values']);
			if ($row['id']==$user) {$x['user']=1;}
			$y[] = $x;
		}
		for ($v = $start-1; ($v<$end)&&($v<count($y)); $v++){
			if ($y[$v]['user']==1){$userFound=1;}
			$w[] = $y[$v];
		}
		$y = $w;
		if ($userFound==0){
			$d = getUserRank($data,$user);
			if ($d!==0){
				$f = json_decode(findUserRankData($data,$d),true);
				if ($y<$start){array_unshift($y,$f['rankings'][0]);}
				if ($y>$end){$y[]=$f['rankings'][0];}
			}
		}

		$z =['rankings'=>$y, 'lastUpdate'=>$data['lastUpdate']];
		return json_encode($z,true);
	}

	function getUserRank($data,$user){
		foreach ($data['rankings'] as $row) {
			if ($row['id']==$user) {return $row['rank'];}
		}
		return 0;
	}
	function findUserRankData($data,$rank){
		if ($rank===0){return null;}
		$x = $data['rankings'][$rank-1];
		$y = array('rank'=> $x['rank'], 'name'=> $x['name'], 'photo'=> $x['photo'], 'values'=> $x['values'], 'user'=>1);
		$v[] = $y;
		$z =['rankings'=>$v, 'lastUpdate'=>$data['lastUpdate']];
		return json_encode($z,true);
	}
	function getUserAmount($data){
		return count($data['rankings'],0);
	}

	function outputCoinTotals($values){
		echo "<html><link rel='icon' type='image/png' href='images/xerafin.png'>";
		echo "<body style='background-color:#000;'>";
		echo "<table style='margin:auto;border:1px solid black;padding:0px;border-collapse:collapse;background-color:rgba(239,239,223,0.9);font-size:0.8em;font-variant:small-caps;font-family:lato,sans-serif;'>";
		$images=array('ruby.png','emerald.png','sapphire.png','gold.png','silver.png','bronze.png');
		echo "<tr style='border-bottom:1px solid #999;'><th>Pos</th><th>Name</th>";
		foreach ($images as $image) {
			echo "<th><img src='images/icons/$image' style='height:20px;width:20px;margin:auto;'></th>";
		}
		echo "<th>Total</th></tr>";
		$values=json_decode($values,true);
		$values=$values['rankings'];
		foreach ($values as $row) {
			if ($row['user']===1) {echo "<tr style='background:rgba(140,176,48,0.9);border-bottom:1px solid #999;'>";} else {echo "<tr style='border-bottom:1px solid #999;'>";}
			echo "<td style='text-align:center;padding:0px;margin:0px;'>".$row['rank']."</td>";
			echo "<td style='border:0px;padding:0px;margin:0px;'>".$row['name']."</td>";
			foreach ($row['values'] as $key=>$val) {
				if ($val=='0') {$val='';}
				echo "<td style='text-align:center;border:0px;padding:0px;margin:0px;font-size:0.8em;'>".$val."</td>";
			}
			echo "</tr>";
		}
		echo "</table></body></html>";
	}


	$data = json_decode(file_get_contents("php://input"));
	if (isset($_GET['year'])){$data->year=$_GET['year'];}
	if (isset($_POST['year'])){$data->year=$_POST['year'];}
	if (!is_int(intval($data->year))){$data->year=0;}
	$datesample = date('Y',time() - (24*60*60));
	if (($data->year!==0) && ((($data->year<2018)) || ($data->year > $datesample))) {$data->year=0;}
	$data->user = $_SESSION['USER_ID'];
	$data->meth = 'post';
	if (isset($_GET['type'])){
		$data->meth='get';
	}
	if (isset($_POST['type'])){
		$data->meth='post';
	}
	//print_r($data);
	switch($data->type){
		case 'top': $data->values = readCoins(0,$data->year);break;
		case 'most': $data->values = readCoins(1,$data->year);break;
		default: $data->values = readCoins(0,$data->year);break;
	}
	if (isset($_POST['findMe'])){echo(findUserRankData($data->values,getUserRank($data->values,$data->user)));}
	else {
		if (isset($_POST['page'])){$data->page = $_POST['page'];}
		else {$data->page = 1;}
		if (isset($_POST['results'])){$data->results = $_POST['results'];}
		else {$data->results = 10;}
		if (isset($data->showMe)){
			$x = getUserAmount($data->values);
			$y = getUserRank($data->values,$data->user);
			//echo "User Rank:".$y." Number Amount:".$x;
			if ($y!==0){
				if ($x<results){$data->first = 1;$data->last = $x;}
				else {
					if (floor(($data->results)/2)+$y>$x){$data->last = $x;}
					else {$data->last = floor(($data->results)/2)+$y;$data->first=$data->last - $data->results + 1;}
					if ($y-floor(($data->results)/2)<1){$data->first = 1;$data->last = $data->results;}
					else {$data->first = $y-floor(($data->results)/2);}
				}
			}
			else {
				$data->last = $x;
				$data->first = $x -($data->results)+1;
			}
		}
		else {$data->last = $data->page * $data->results;$data->first = ($data->page-1)*($data->results)+1;}

		switch($data->meth){
			case 'post':
				echo(extractCoinData($data->values,$data->first,$data->last,$data->user));
				break;
			case 'get':
				outputCoinTotals(extractCoinData($data->values,1,getUserAmount($data->values),$data->user));
				break;
			default:
				break;
		}
	}
?>
