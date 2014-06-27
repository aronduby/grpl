<?php
header("Content-type: text/plain;");

$dsn = 'mysql:dbname=grpl;host=localhost';
$user = 'grpl';
$password = 'phyle7mothy';

try {
    $dbh = new PDO($dsn, $user, $password);
    $dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);    
} catch (PDOException $e) {
    echo 'Connection failed: ' . $e->getMessage();
}

$sql = "
	SELECT
		DATE_FORMAT(starts, '%Y-%m-%d') AS starts, season_id
	FROM
		league_night
	WHERE
		starts < :starts
	ORDER BY 
		starts DESC 
	LIMIT 1
";
$prev_night_query = $dbh->prepare($sql);
$prev_night_query->bindParam(':starts', $starts);

$ranking_sql = "
	SELECT
		pfts.name_key,
		CONCAT(score,'.',firsts,'.',seconds,'.',thirds,'.',fourths,'.',subs) AS scoring_string
	FROM
		(
			SELECT 
				pts.name_key 
			FROM 
				player_to_season pts 
				LEFT JOIN player p USING(name_key)
			WHERE 
				pts.season_id = :current_season_id 
			ORDER BY 
				p.last_name
		) AS pfts
		LEFT JOIN ( 
			SELECT  
				p.name_key,
				p.last_name,
				p.first_name,
				SUM(n.points) AS score, 
				SUM(n.firsts) AS firsts,
				SUM(n.seconds) AS seconds,
				SUM(n.thirds) AS thirds,
				SUM(n.fourths) AS fourths,
				SUM(n.subbed) AS subs
			FROM
				player_points_per_night n
				LEFT JOIN player p USING(name_key)
			WHERE
				season_id = :prev_night_season_id
				AND starts <= :prev_night_starts
			GROUP BY
				name_key
		) AS f USING(name_key)
	ORDER BY
		score DESC,
		firsts DESC,
		seconds DESC,
		thirds DESC,
		fourths DESC,
		subs DESC,
		last_name,
		first_name
";
$ranking_query = $dbh->prepare($ranking_sql);
$ranking_query->bindParam(':current_season_id', $season_id);
$ranking_query->bindParam(':prev_night_season_id', $prev_night_season_id);
$ranking_query->bindParam(':prev_night_starts', $prev_night_starts);

$no_prev_ranking_sql = "
	SELECT
		pts.name_key, '0' AS scoring_string
	FROM
		player_to_season pts
		LEFT JOIN player p USING(name_key)
	WHERE
		pts.season_id = :current_season_id
	ORDER BY 
		p.last_name, p.first_name
";
$no_prev_ranking_query = $dbh->prepare($no_prev_ranking_sql);
$no_prev_ranking_query->bindParam(':current_season_id', $season_id);


$order_sql = "INSERT INTO league_night_order (`night_id`, `name_key`, `rank`, `start_order`, `grouping`) VALUES (:current_night_id, :name_key, :rank, :order, :grouping)";
$order_query = $dbh->prepare($order_sql);
$order_query->bindParam(':current_night_id', $night_id);
$order_query->bindParam(':name_key', $name_key);
$order_query->bindParam(':rank', $rank);
$order_query->bindParam(':order', $order);
$order_query->bindParam(':grouping', $grouping);


$sql = "SELECT DATE_FORMAT(starts, '%Y-%m-%d') AS starts, night_id, season_id FROM league_night ORDER BY starts";
$nights = $dbh->query($sql)->fetchAll(PDO::FETCH_OBJ);
foreach($nights AS $night){

	$starts = $night->starts;
	$season_id = $night->season_id;
	$night_id = $night->night_id;

	$rank = 0;
	$order = 0;
	$grouping = 0;
	$previous_scoring_string = '';

	
	$prev_night_query->execute();
	$prev_night = $prev_night_query->fetch(PDO::FETCH_OBJ);
	
	if($prev_night === false){
		$rq = $no_prev_ranking_query;
	} else {
		$prev_night_season_id = $prev_night->season_id;
		$prev_night_starts = $prev_night->starts;

		$rq = $ranking_query;	
	}
	

	$rq->execute();
	foreach($rq->fetchAll(PDO::FETCH_OBJ) as $player){

		if($player->scoring_string != $previous_scoring_string){
			$rank = $order + 1;
		}

		$name_key = $player->name_key;

		var_dump( $order_query->execute() );

		if($order %4 == 3)
			$grouping++;
	
		$previous_scoring_string = $player->scoring_string;
		$order++;
	}
}

print "\n\nDONE!";


?>