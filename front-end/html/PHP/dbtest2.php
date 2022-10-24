<?php
	include_once 'config.php';
	session_start();
	if (!isset($_GET['page'])) {$_GET['page']=1;}
	if ($_GET['page']<1){$_GET['page']=1;}
	echo "<body style='background:#eee;'>\n";
	if ($_SESSION['PRIV_LEVEL']>69) {
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		if (isset($_GET['table'])){
			$sql='SELECT COUNT(*) FROM '.$_GET['table'];
			$result = $mysqli->query($sql);
			$rows = $result->fetch_assoc();
			$amount = $rows['COUNT(*)'];
			if ((($_GET['page']-1)*100)>($amount)){$_GET['page']=ceil(($amount/100));}
			$minVal = ($_GET['page']-1)*100;

			$maxVal = $_GET['page']*100;
			if ($maxVal>$amount) {$maxVal=$amount;}
			echo "<div style='width:100%'>";
			echo "<div style='width:100%;padding:5px;background:#88aa88;'>\n";
			echo "<div style='font-size:1.3em;'>Contents of Table: ".$_GET['table']."</div>\n";
			echo "<div style='font-size:1.0em;'><div style='display:inline-block'>Showing Rows:".(1+$minVal)."-".$maxVal." of ".$amount."\n";
			if ($minVal > 0) {
				echo "<button onClick='window.location.href=\"dbtest2.php?table=".$_GET['table']."&page=".($_GET['page']-1)."\"'>Prev</button>\n";
			}
			if ($amount>$maxVal){
				echo "<button onClick='window.location.href=\"dbtest2.php?table=".$_GET['table']."&page=".($_GET['page']+1)."\"'>Next</button>\n";
			}
			if ($minVal>0){
				echo "<button onClick='window.location.href=\"dbtest2.php?table=".$_GET['table']."&page=1\"'>First</button>\n";
			}
			if ($amount>$maxVal){
				echo "<button onClick='window.location.href=\"dbtest2.php?table=".$_GET['table']."&page=".ceil(($amount/100))."\"'>Last</button>\n";
			}

			echo "<button onClick='window.location.href=\"dbtest2.php\"'>Overview</button>\n</div>\n";
			echo "<div style='display:inline-block;'><form action='dbtest2.php' method='get'>\n";
			echo "<label>Go to Page:</label> <input type='hidden' name='table' value='".$_GET['table']."' /><input name='page' type='text' style='width:50px'>\n";
			echo "<button type='submit'>Go</button></form>\n</div>\n</div>\n</div>\n";
			$sql='SHOW COLUMNS FROM '.$_GET['table'];
			$res = $mysqli->query($sql);
			echo "<div style='width:100%'>\n<table style='width:80%'>\n<tr style='font-weight:bold'>\n";
			while($row = $res->fetch_assoc()){
				echo "<td>".$row['Field']."</td>\n";
				$columns[]=$row['Field'];
			}
			echo "</tr>\n";
			$sql='SELECT * FROM '.$_GET["table"].' LIMIT '.$minVal.", 100";
			$res = $mysqli->query($sql);
			while($row = $res->fetch_assoc()){
				echo "<tr>\n";
				foreach ($columns as $value) {
					echo "<td>".$row[$value]."</td>\n";
				}
				echo "</tr>\n";
			}
			echo "</table>\n</div>\n</div>\n";
		}
		else {
			$sql = "SHOW TABLES FROM t2i7n6t5_xerafin";
			$result = $mysqli->query($sql);
			while ($table = $result->fetch_assoc()) {
				echo "<div style='width:25%;padding:5px;margin:20px;border:1px solid black;background:#ccc;display:inline-block;'>\n<div style='padding:5px;font-size:1.3em;background:#88aa88;'><a href='dbtest2.php?table=".$table['Tables_in_t2i7n6t5_xerafin']."'>".$table['Tables_in_t2i7n6t5_xerafin']."</a></div>";
				echo "<div>\n<table style='width:100%;border:1px solid #555;'>\n";
				$sql = 'SHOW COLUMNS FROM '.$table['Tables_in_t2i7n6t5_xerafin'];
				$res = $mysqli->query($sql);
				echo "<tr style='font-weight:bold;border:1px solid #555;'>\n<td>Field</td>\n<td>Type</td>\n<td>Null</td>\n<td>Key</td>\n<td>Default</td>\n<td>Extra</td>\n</tr>";
				while($row = $res->fetch_assoc()){
					echo "<tr>\n";
					echo "<td>".$row['Field']."</td>\n";
					echo "<td>".$row['Type']."</td>\n";
					echo "<td>".$row['Null']."</td>\n";
					echo "<td>".$row['Key']."</td>\n";
					echo "<td>".$row['Default']."</td>\n";
					echo "<td>".$row['Extra']."</td>\n";
					echo "</tr>\n";
				}
				echo "</table>\n</div>\n<div>";
				echo "</div></div>";
			}
		}
	}
	else {
		echo "You don't have permissions to view this page";
	}
	echo "</body>\n";
?>
