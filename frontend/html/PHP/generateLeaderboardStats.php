<?php
	include_once 'config.php';

	function createDayTable(){
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$sql='CREATE TABLE leaderboardStats (
		date DATE,
		PRIMARY KEY,
		totalUsers INT(20) NOT NULL,
		questionsAnswered INT(32) NOT NULL)';
		if ($mysqli->query($sql) === TRUE) {
			echo "Table leaderboardStats_Day created successfully";
		}
		else {
			echo "Error creating table: " . $mysqli->error;
		}
	}
	function getDays() {
		echo "<table style='border:1px solid blaCk'>\n";
		echo "<tr><td>Date</td><td>Type</td><td>Users</td><td>Questions</td></tr>";
		$mysqli = new mysqli("localhost", DB_USER, DB_PASS, DB_NAME);
		$sql="
		(SELECT SUM(questionsAnswered), COUNT(DISTINCT userid), 'Y' AS period, dateStamp FROM leaderboard WHERE YEAR(dateStamp)<YEAR(NOW()) GROUP BY YEAR(dateStamp) ASC)
		UNION
		(SELECT SUM(questionsAnswered), COUNT(DISTINCT userid), 'M' AS period, dateStamp FROM leaderboard WHERE IF(YEAR(dateStamp) = YEAR(NOW()), IF (MONTH(dateStamp)=MONTH(NOW()), 1, 0), 0) =0 GROUP BY YEAR(dateStamp), MONTH(dateStamp) ASC)
		UNION
		(SELECT SUM(questionsAnswered), COUNT(DISTINCT userid), 'W' AS period, dateStamp FROM leaderboard WHERE IF(YEAR(dateStamp) = YEAR(NOW()), IF (WEEK(dateStamp, 7)=WEEK(NOW(),7), 1, 0), 0) =0 GROUP BY YEAR(dateStamp), WEEK(dateStamp, 7) ASC)
		UNION
		(SELECT SUM(questionsAnswered), COUNT(DISTINCT userid), 'D' AS period, dateStamp FROM leaderboard GROUP BY dateStamp)
		ORDER BY dateStamp, CASE period WHEN 'D' THEN 4 WHEN 'W' THEN 3 WHEN 'M' THEN 2 WHEN 'Y' THEN 1 ELSE 5 END
		";
		$result = $mysqli->query($sql);
		while($row = $result->fetch_assoc()){
				echo "<tr style='border:1px solid blaCk'>\n";
				echo "<td style='width:15%'>".$row['dateStamp']."</td>\n";
				echo "<td style='width:15%'>".$row['period']."</td>\n";
				echo "<td style='width:15%'>".$row['COUNT(DISTINCT userid)']."</td>\n";
				echo "<td style='width:15%'>".$row['SUM(questionsAnswered)']."</td>\n";
				echo "</tr>\n";
				$columns[]=$row['Field'];
			}
		echo "</table>\n";
	}
	getDays();
?>
