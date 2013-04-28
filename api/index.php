<?php
require 'common.php';

require 'Slim/Slim.php';
\Slim\Slim::registerAutoloader();


$app = new \Slim\Slim();
$app->add(new \Slim\Middleware\SessionCookie([
	'secret' => 'Ploegs',
]));

// sets it to output json content type
$res = $app->response();
$res['Content-Type'] = 'application/json';


/*
 *	Gets a listing of all of the LeagueNights for the Season
*/
$app->get('/leaguenight', function() use ($app, $season){

	$weeks = LeagueNight::getAllForSeason($season);

	$totals = new StdClass();
	$totals->starts = 'totals';
	$totals->night_id = 'totals';
	$totals->title = 'Totals to Date';
	$totals->note = '';
	array_unshift($weeks, $totals);

	echo json_encode($weeks);
});

/*
 *	Totals of this season
*/
$app->get('/leaguenight/totals', function() use ($app, $season){
	
	$players = PlayerGroupList::getRankings($season);
	$machines = Machine::getMachinesPlayedLessThanXTimes($season, 2);

	$night = new StdClass();
	$night->starts = 'totals';
	$night->night_id = 'totals';
	$night->title = 'Totals to Date';
	$night->note = '';
	$night->players = $players;
	$night->machines = $machines;
	$night->machines_note = 'Machines Played Less Than Twice';

	echo json_encode($night);

});


/*
 *	The LeagueNight no players or machines
*/
$app->get('/leaguenight/:starts', function($starts) use ($app, $season){

	$night = LeagueNight::create($starts);
	if($night === false)
		throw new Exception('No LeagueNight found with that start date and time of '.$_GET['starts']);

	// past event
	if(strtotime($night->starts) <= strtotime('today')){
		$night->players = PlayerGroupList::getPointsForNight($night);
	} else {
		$night->players = PlayerGroupList::getRankings($season);
	}

	$night->machines = Machine::getForLeagueNight($night);
	if(count($night->machines)==0){
		$night->machines = Machine::getMachinesPlayedLessThanXTimes($season, 2);
		$night->machines_note = 'Machines Played Less Than Twice';
	}

	$night->subs = $night->getSubs();

	echo json_encode($night);

});

/*
 *	Players for the specified night
*/
$app->get('/leaguenight/totals/players', function() use ($app, $season){
	$players = PlayerGroupList::getRankings($season);
	echo json_encode($players);
});

$app->get('/leaguenight/:starts/players', function($starts) use ($app, $season){

	$night = LeagueNight::create($starts);
	if($night === false)
		throw new Exception('No LeagueNight found with that start date and time of '.$_GET['starts']);

	// if the date is in the past show the scores for that night
	// otherwise just show the rankings
	// using today defaults to 12am today so this will keep things
	// from getting weird during league night
	if(strtotime($starts) < strtotime("today")){
		$players = PlayerGroupList::getPointsForNight($night);
	} else {
		$players = PlayerGroupList::getRankings($night);
	}
	
	echo json_encode($players);

});

/*
 *	Machines for the specified night
*/
$app->get('/leaguenight/totals/machines', function() use ($app, $season){
	echo json_encode([]);
});

$app->get('/leaguenight/:starts/machines', function($starts) use ($app, $season){
	$night = LeagueNight::create($starts);
	if($night === false)
		throw new Exception('No LeagueNight found with that start date and time of '.$_GET['starts']);

	$machines = Machine::getForLeagueNight($night);

	echo json_encode($machines);

});


/*
 *	Machine List
*/
$app->get('/machine', function() use ($app, $season){

	$machines = Machine::getForSeason($season);
	echo json_encode($machines);

});

/*
 *	Machine Info
*/
$app->get('/machine/:abbv', function($abbv) use ($app, $season){

	$machine = Machine::create($abbv);
	echo json_encode($machine);

});



/*
 *	Player Info
*/
$app->get('/players', function() use ($app, $season){

	// $players = PlayerGroupList::getRankings($season);
	echo json_encode(Player::getAllForSeason($season));	

});

$app->get('/players/:name_key', function($name_key) use($app, $season){

	$dbh = PDODB::getInstance();
	$json = new StdClass();

	$player = Player::create($name_key);
	$json->player = $player;

	// ranking
	$rankings = PlayerGroupList::getRankings($season);
	$place = $rankings->getPlaceForPlayer($player);
	$json->place = $place;

	// total points
	$group = $rankings->getGroupForPlayer($player);
	$total_points = $group->offsetGet($player);
	$json->total_points = $total_points;

	// league night points
	$sql = "SELECT
		l.title, lns.starts, SUM(lns.points) AS points
	FROM
		league_night l
		LEFT JOIN league_night_score lns USING(starts)
	WHERE
		l.season_id=".$dbh->quote($season->season_id)."
		AND lns.name_key=".$dbh->quote($player->name_key)."
	GROUP BY lns.name_key, lns.starts
	ORDER BY l.starts DESC";
	$nights = $dbh->query($sql)->fetchAll(PDO::FETCH_OBJ);
	$json->nights = $nights;

	// machine points
	$sql = "SELECT
		m.*, lns.points, lns.starts
	FROM
		league_night l
		LEFT JOIN league_night_score lns USING(starts)
		LEFT JOIN machine m USING(abbv)
	WHERE
		l.season_id=".$dbh->quote($season->season_id)."
		AND lns.name_key=".$dbh->quote($player->name_key)."
	ORDER BY m.name";
	$machines = $dbh->query($sql)->fetchAll(PDO::FETCH_OBJ);
	$json->machines = $machines;

	echo json_encode($json);

});

// Take a FB Access token, grabs the fb.user_id and gets the player from the db
$app->get('/players/login/:token', function($token) use ($app, $season){
	$player = Player::getByFBToken($token);
	if($player != false){
		$_SESSION['player'] = $player->name_key;
	}
	echo json_encode($player);
});



/*
 *	SCORING FUNCTIONS
*/
$app->get('/scoring/:starts(/:current_offset)', function($starts, $current_offset = 0) use ($app, $season){

	$player = Player::create($_SESSION['player']);
	$night = LeagueNight::create($starts);
	$machines = Machine::getForLeagueNight($night);
	$all_groupings = PlayerGroupList::getRankings($night);
	$players_group = $all_groupings->getGroupForPlayer($player);
	// $current_offset = array_key_exists('current_offset',$_REQUEST) ? $_REQUEST['current_offset'] : 0;


	$i = $players_group->offset;
	$machine_order = [];
	while(count($machine_order) < count($machines)){
		if(!array_key_exists($i, $machines))
			$i = 0;

		$machine_order[] = $machines[$i];
		$i++;
	}

	if(isset($machine_order[$current_offset]))
		$current_game = $machine_order[$current_offset];
	else
		throw new Exception('No current machine found for that offset');

	if(isset($machine_order[$current_offset + 1]))
		$next_game = $machine_order[$current_offset + 1];
	else
		$next_game = false;

	$player_order = [];
	$infinite_it = new InfiniteIterator(new ReverseIterator($players_group)); // allows us to wrap back to the players skipped by the offset/limit
	$limit_it = new LimitIterator($infinite_it, $current_offset, $players_group->count());
	foreach($limit_it as $p){
		$player_order[] = $p;
	}	

	// grab any scores which might already be in the system
	$dbh = PDODB::getInstance();
	$sql = "SELECT 
			name_key, place 
		FROM 
			league_night_score 
		WHERE 
			starts='".$night->starts."' 
			AND abbv='".$current_game->abbv."' 
			AND name_key IN ('".implode("', '", $players_group->pluck('name_key'))."')";
	$stmt = $dbh->query($sql);
	$places = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
	

	$rsp = [
		'league_night' => $night,
		'current_offset' => $current_offset,
		'current_machine' => $current_game,
		'next_machine' => $next_game,
		'player_order' => $player_order,
		'places' => $places
	];
	echo json_encode($rsp);

});

$app->post('/scoring', function() use ($app, $season){
	$dbh = PDODB::getInstance();

	$stmt = $dbh->prepare("INSERT INTO league_night_score SET starts=:starts, name_key=:name_key, abbv=:abbv, place=:place ON DUPLICATE KEY UPDATE place=VALUES(place)");
	$stmt->bindValue(':starts', $_POST['starts']);
	$stmt->bindValue(':abbv', $_POST['abbv']);
	$stmt->bindParam(':name_key', $name_key);
	$stmt->bindParam(':place', $place);

	foreach($_POST['players'] as $name_key=>$place){
		$stmt->execute();
	}

	$app->redirect('scoring/'.$_POST['starts'].'/'.(++$_POST['current_offset']));

});


$app->run();


?>