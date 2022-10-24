<?php
include (__DIR__ ."/../PHP/config.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);
function writeCoins($data,$type,$year){
	if ($type==1) {$file='awardsMost';}
	if ($type==0) {$file='awardsTop';}
	if ($year>0) {$file=$file.'_'.$year;}
	$file=$file.'.JSON';
	$fname = __DIR__ ."/../JSON/rankings/".$file;
	echo "Writing:".$fname.'<br>';
	$x = file_put_contents($fname, print_r($data, true));
}

function getCoinsTotal($type,$year){
	$ordering = 'emerald DESC, ruby DESC, sapphire DESC, gold DESC, silver DESC, bronze DESC,';
	if ($type===1) {$ordering = 'total DESC, '.$ordering;}
	if ($year===0){
		$sql='SELECT *, emerald+ruby+sapphire+gold+silver+bronze AS total, firstName, lastName, photo, countryId FROM user_coin_total JOIN login USING (userid) JOIN user_prefs USING (userid) ORDER BY '.$ordering.' dateStamp ASC';
	}
	if ($year>2017){
		$coins = array('0'=>'emerald','1'=>'ruby','2'=>'sapphire','3'=>'gold','4'=>'silver','5'=>'bronze');
		$sql='SELECT userid,firstName,lastName,photo,countryId,';
		foreach ($coins as $key=>$coin) {
			$sql=$sql.'SUM(amount * (coinType='.$key.')) AS '.$coin.',';
		}
		$sql=$sql.'MIN(dateStamp) AS earliest,SUM(amount) AS total FROM user_coin_log JOIN login USING (userid) JOIN user_prefs USING (userid) WHERE YEAR(dateStamp)='.$year.'
		GROUP BY userid,firstName,lastName,photo,countryId ORDER BY '.$ordering.' earliest ASC';
	}
	//echo $sql.'<br>';
	$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
	//$mysqli = new mysqli("localhost", READ_USER, READ_PASS, READ_NAME);
	$result = $mysqli->query($sql);
	$pos = 0;
	$y=[];
	while($row = $result->fetch_assoc()){
		$pos++;
		$x=array('rank'=>$pos, 'name'=> $row['firstName']." ".$row['lastName'],'id'=>$row['userid'], 'countryId'=>$row['countryId'], 'photo'=>$row['photo'],
		'values'=> array('emerald'=>$row['emerald'],'ruby'=>$row['ruby'],'sapphire'=>$row['sapphire'],'gold'=>$row['gold'],'silver'=>$row['silver'],'bronze'=>$row['bronze'],'total'=>$row['total'])
		);
		$y[]=$x;
	}
	$z=['rankings'=>$y,'lastUpdate'=>time()];
	$mysqli->close();
	writeCoins(json_encode($z,true),$type,$year);
}
getCoinsTotal(0,0);
getCoinsTotal(1,0);
getCoinsTotal(0,2018);
getCoinsTotal(1,2018);
getCoinsTotal(0,2019);
getCoinsTotal(1,2019);
getCoinsTotal(0,2020);
getCoinsTotal(1,2020);
$x = time() - (24*60*60);
getCoinsTotal(0,date('Y',$x));
getCoinsTotal(1,date('Y',$x));
?>
