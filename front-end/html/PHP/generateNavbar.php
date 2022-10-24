<?php
session_start();

function navbarCreateElement ($arr,$privLevel,$nest){
	$line="";

	if ($arr['privLevel']<=$privLevel){
		if ($arr['hasChildren']===true){
			$line="<li class='dropdown'><a href='#' class='dropdown-toggle' data-toggle='dropdown'>".$arr['title']."<b class='caret'></b></a>\n";
			$line=$line."<ul class='dropdown-menu'>\n";
			$nest++;
		}
		else {
			if ($arr['new']===true) {
				$line="<li><a href='#' onClick='".$arr['onClick']."'>".$arr['title']."<span style='color:red'>&nbsp;NEW!</span></a></li>\n";
			}
			else {
				$line="<li><a href='#' onClick='".$arr['onClick']."'>".$arr['title']."</a></li>\n";
			}
		}
	}
	if (($arr['lastChild']===true) && ($nest!==0)) {
		$line=$line."</ul>\n</li>\n";
		$nest--;
	}
	return array($line,$nest);
}
function iconBarGenerate($arr, $privLevel){
	$x=0;
	foreach ($arr as $value) {

			if ($arr['privLevel']<=$privLevel){$x++;}
	}
	if ($x>0) {
		$result="<div id='icons' class='' style='width:".(($x*40)+5)."px;height:50px!important;'>\n";
		foreach ($arr as $value) {
			if ($value['privLevel']<=$privLevel){
				$result=$result."<span onClick='".$value['onClick']."'><img id='".$value['id']."' src='".$value['src']."' style='padding-top:8px;height:40px;width:40px;vertical-align:middle;margin:auto;'></span>\n";
				if ($value['badge']===true){
					$result=$result."<div id='".$value['id']."Badge' style='position:relative;left:5px;top:-15px;background-color:rgba(239,239,199,0.6);width:30px;height:15px;font-size:12px;font-weight:bold;border-radius:8px;text-align:center;line-height:15px;vertical-align:middle;'></div>";
				}
			}
		}
		$result=$result."</div>\n";
	}
	return $result;
}
function navbarGenerate (){
	$icons = array(
		array('src' => 'images/icons/bug_buddy.png', 'id' => 'bugIcon', 'badge' => true, 'onClick' => 'countBugs()', 'privLevel' => '70')
	);
	$contents = array(
		array('title' => 'Basic Quiz', 'onClick' => 'overview.setGoAction({context:"MY",value:0});overviewUI.update("MY_GO_SET_DEFAULT",0);overviewUI.update("SEARCH_GO_SET_DEFAULT",0);overview.go("MY");', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Subword Sloth!', 'onClick' => 'initSloth()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Cardbox Invaders', 'onClick' => 'initInvaders()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Wall of Words', 'onClick' => 'overview.setGoAction({context:"MY",value:1});overviewUI.update("MY_GO_SET_DEFAULT",1);overviewUI.update("SEARCH_GO_SET_DEFAULT",1);overview.go("MY");', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Widgets', 'onClick' => '', 'hasChildren' => true, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
//		array('title' => 'Cardbox & Chill', 'onClick' => 'initTogether()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => true),
		array('title' => 'Cardbox', 'onClick' => 'showCardboxStats()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Alphagram Info', 'onClick' => 'showAlphaStats(toAlpha($.trim(prompt("Enter a word or alphagram to display"))))', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Rankings', 'onClick' => 'initLeaderboard()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Debug', 'onClick' => 'initDebug()', 'hasChildren' => false, 'privLevel' => '42', 'lastChild' => false, 'new' => true),
		array('title' => 'Game Stats', 'onClick' => 'showGameStats()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => true, 'new' => false),
//		array('title' => 'TSH feed', 'onClick' => 'initTournamentStandings()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => true, 'new' => true),
		array('title' => 'Settings', 'onClick' => '', 'hasChildren' => true, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'User Prefs', 'onClick' => 'initUserPrefs()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => false, 'new' => false),
		array('title' => 'Manage Words to Add', 'onClick' => '', 'hasChildren' => false, 'privLevel' => '60', 'lastChild' => false, 'new' => true),
		array('title' => 'Logout', 'onClick' => 'logoutUser()', 'hasChildren' => false, 'privLevel' => '1', 'lastChild' => true, 'new' => false),
		array('title' => 'Admin', 'onClick' => '', 'hasChildren' => true, 'privLevel' => '60', 'lastChild' => false, 'new' => false),
		array('title' => 'Manage', 'onClick' => 'initManageUsers()', 'hasChildren' => false, 'privLevel' => '60', 'lastChild' => false, 'new' => true),
		array('title' => 'Manage Users', 'onClick' => 'initOldManageUsers()', 'hasChildren' => false, 'privLevel' => '60', 'lastChild' => true, 'new' => false)
	);
	$result='
	<div class="container-fluid">
		<nav class="navbar navbar-inverse navbar-fixed-top metalBThree" id="xeraNav">
			<img class="navbar-brand noselect" src="images/xerafinNew.png" style="height:50px;padding:5px!important;background:transparent;vertical-align:middle;">
			<div class="navbar-header" style="padding:0px!important;margin:0px!important;">
			<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
			</div>
			<div class="collapse navbar-collapse" id="myNavbar">
				<ul class="nav navbar-nav " style="vertical-align:middle;" id="menuList">';
	$nest=0;
	if ((isset($_SESSION['PRIV_LEVEL'])) && (isset($_SESSION['USER_ID']))){

		foreach ($contents as $value) {
			$values=navbarCreateElement($value, $_SESSION['PRIV_LEVEL'], $nest);
			$result=$result.$values[0];
			$nest = $values[1];
		}
	}
 $kofiWidget = "<li style='margin-top:5px!important;'>
					<span id='kofiWidget'>
					</span>
				</li>";
 $result = $result."
				<script type='text/javascript'>
					kofiwidget2.init('Support Xerafin', 'rgba(140,176,48,0.95)', 'V7V11H3Z1');
					document.getElementById('kofiWidget').innerHTML = kofiwidget2.getHTML();
					$('.kofi-button').addClass('metalBOne');
				</script>";
  $result = $result.$kofiWidget;
  $result = $result.'</ul>';
  //$result=$result.$kofiWidget;
	return $result.'</div></nav></div>';
}
$result=navbarGenerate();
session_commit();
echo $result;

?>
