<?php
include_once ($_SERVER["DOCUMENT_ROOT"].'/PHP/config.php');
function getSecLevel(){
  $mysqli = new mysqli("localhost", READ_USER, READ_PASS, READ_NAME);
  $sql='SELECT secLevel FROM user_prefs WHERE userid="'.$_SESSION['USER_ID'].'"';
  $result = $mysqli->query($sql);
  $rows = $result->fetch_assoc();
  $mysqli->close();
  return $rows['secLevel'];
}

function getLocalSecLevel(){
  $mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
  $sql='SELECT secLevel FROM user_prefs WHERE userid="'.$_SESSION['USER_ID'].'"';
  $result = $mysqli->query($sql);
  $rows = $result->fetch_assoc();
  $mysqli->close();
  return $rows['secLevel'];
}


function getPrivTitle($level){
  $mysqli = new mysqli("localhost", READ_USER, READ_PASS, READ_NAME);
  $sql='SELECT title FROM privLevelInfo WHERE privlevel="'.$level.'"';
  $result = $mysqli->query($sql);
  $rows = $result->fetch_assoc();
  $mysqli->close();
  return $rows['title'];
}

function populateXerfSess($sessid) {

  // look up sessid in login to get userid etc

  $user = getUseridFromXerfSess($sessid);

  if ($user!==null) {
  // set $_SESSION['USER_ID']
      $_SESSION['USER_ID'] = $user;
      $_SESSION['PRIV_LEVEL']=getSecLevel();
      $_SESSION['LOCAL_LEVEL']=getLocalSecLevel();
      $_SESSION['PRIV_TITLE']=getPrivTitle($_SESSION['PRIV_LEVEL']);
      return true;
  } else { return false; }

} // end populateXerfSess

function regenerateSession($reload = false)
{
    // This token is used by forms to prevent cross site forgery attempts
    if(!isset($_SESSION['nonce']) || $reload)
        $_SESSION['nonce'] = md5(microtime(true));
    // Set current session to expire in 10 minutes
    $_SESSION['OBSOLETE'] = true;
    $_SESSION['EXPIRES'] = time() + 600;

    // Create new session without destroying the old one
    session_regenerate_id(false);

    // Grab current session ID and close both sessions to allow other scripts to use them
    $newSession = session_id();
    session_write_close();

    // Set session ID to the new one, and start it back up again
    session_id($newSession);
    session_start();

    // Don't want this one to expire
    unset($_SESSION['OBSOLETE']);
    unset($_SESSION['EXPIRES']);
}

  function checkSession()
{
    try{
    if((isset($_SESSION['OBSOLETE']))&&(isset($_SESSION['EXPIRES']))){
      if($_SESSION['OBSOLETE'] && ($_SESSION['EXPIRES'] < time()))
        throw new Exception('Attempt to use expired session.');
    }
    if((isset($_SESSION['USER_ID']))){
      if(!is_numeric($_SESSION['USER_ID']))
        throw new Exception('No session started.');
    }

    if((isset($_SESSION['OBSOLETE']))){
      if(!$_SESSION['OBSOLETE'] && mt_rand(1, 100) == 1)
      {
        regenerateSession();
      }
    }
        return true;

    }catch(Exception $e){
        return false;
    }
}

?>
