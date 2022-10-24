<?php
$user = "xerafin";
$password = "x3r4f1N)";
$database = "xerafin";
$table = "csw21";

try {
 $db = new PDO("mysql:host=localhost;dbname=$database", $user, $password);
 echo "<h2> Total Words in the List </h2><ul>";
 foreach($db->query("SELECT count(*) FROM $table") as $row) {
   echo "<li>" . $row[0] . "</li>";
 }
 echo "</ul>";

 } catch (PDOException $e) {
  print "Database Error!: " . $e->getMessage() . "<br/>";
  die();
}
