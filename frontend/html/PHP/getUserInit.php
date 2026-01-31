<?php
include_once ("config.php");
function readConfig($path){
  $fp=fopen($path,'r');
  $x= fread($fp,filesize($path));
  fclose($fp);
  return $x;
}
function generateScripts($type,$config) {
  if ($type==0){$x='preload';}
  else {$x='scripts';}
  $sets = array();
  $defaultPath='js/';
  foreach ($config[$x] as $level){
    $row = array();
    foreach ($level['files'] as $value){
      if ($type==1){
        if (intval($_SESSION['LOCAL_LEVEL'])>=intval($value['level'])){
          $row[] = array(
            'path' => $defaultPath."".$value['title']."".".js?v=".filemtime($_SERVER["DOCUMENT_ROOT"].'/'.$defaultPath."".$value['title']."".".js"),
            'title' => $value['title']
          );
        }
      }
      if ($type==0){
        $row[] = array(
          'path' => $defaultPath."".$value['title']."".".js?v=".filemtime($_SERVER["DOCUMENT_ROOT"].'/'.$defaultPath."".$value['title'].".js"),
          'title' => $value['title']
        );
      }
    }
    $sets[] = array ('group' => $level['group'], 'files' => $row);
  }
  if ($type==1){
    if (intval($_SESSION['LOCAL_LEVEL'])==0) {
      $row = array();
      $row[] = array(
          'path' => $defaultPath."sorry.js?v=".filemtime($_SERVER["DOCUMENT_ROOT"].'/'.$defaultPath."sorry.js"),
          'title' => "sorry"
        );
      $sets[0] = array("scripts"=>$row);
    }
    if (intval($_SESSION['LOCAL_LEVEL']==-1)) {
      $row = array();
      $row[] = array(
          'path' => $defaultPath."denied.js?v=".filemtime($_SERVER["DOCUMENT_ROOT"].'/'.$defaultPath."denied.js"),
          'title' => "denied"
      );
      $sets[0] = array("scripts"=>$row);
    }
  }
  return $sets;
}

function getPublicID(){
  $sql = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
  $query = 'SELECT userid, xid FROM user_prefs WHERE userid = ?';
  if ($stmt = $sql->prepare($query)){
    $stmt->bind_param("s",$_SESSION['USER_ID']);
    $stmt->execute();
    $result = $stmt->get_result();
    while($row = $result->fetch_assoc()){
      $x = $row['xid'];
    }
    $stmt->close();
    $sql->close();
    return $x;
  }
  else {
    echo "ERROR! ".$query."<BR>";
  }
}
function generateNav($config) {
  $sets = array();
  foreach ($config['nav'] as $level){
    $row = array();
    foreach ($level['content'] as $value){
      if ($_SESSION['LOCAL_LEVEL']>=$value['privLevel']){
        $row[] = array("title" => $value['title'],"icon" => $value['icon'],"click" => $value['onClick'],"new" => $value['new']);
      }
    }
    $sets[] = array("group" => $level['group'], "content" => $row);
  }
  return $sets;
}
$conf = json_decode(readConfig($_SERVER["DOCUMENT_ROOT"]."/JSON/config/configClient.xerf"),true);
$data = json_decode(file_get_contents("php://input"),false);
session_start();

if (isset($data->status)){
  if ($data->status==true){$outp= array("scripts" => generateScripts(1,$conf),"nav" => generateNav($conf));}
  else {$outp= array("preload" => generateScripts(0,$conf));}
  if (array_key_exists('LOCAL_LEVEL', $_SESSION) && $_SESSION['LOCAL_LEVEL']>0){
    $outp["storage"] = json_decode(readConfig($_SERVER["DOCUMENT_ROOT"]."/JSON/config/defaultStorage.xerf"),true);
    $outp["user"] = getPublicID();
  }
  $outp["SESSION"] = $_SESSION;
  echo json_encode($outp);
}
session_commit();
?>
