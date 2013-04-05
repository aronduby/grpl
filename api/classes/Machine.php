<?php

class Machine extends DBObject {
	
	public $machine_id;
	public $season_id;
	public $name;
	public $abbv;
	public $image;
	public $url;	

	// db info
	protected $table = 'machine';
	protected $primary_key = 'abbv';

	## CONTROLLER FUNCTIONS
	public static function getForLeagueNight(LeagueNight $league_night){
		
		$sql = "SELECT abbv FROM machine_to_league_night WHERE starts = '".$league_night->starts."' ORDER BY abbv";

		$dbh = PDODB::getInstance();
		$stmt = $dbh->query($sql);
		$machines = [];
		while($abbv = $stmt->fetch(PDO::FETCH_COLUMN))
			$machines[] = Machine::create($abbv);

		return $machines;

	}

	public static function getForSeason(Season $season){
		
		$sql = "SELECT * FROM machine WHERE season_id = '".$season->season_id."' ORDER BY abbv";

		$dbh = PDODB::getInstance();
		$stmt = $dbh->query($sql);
		$machines = $stmt->fetchALL(PDO::FETCH_CLASS, 'Machine');

		return $machines;

	}

	public static function getMachinesPlayedLessThanXTimes(Season $season, $times = 2){
		$sql = "SELECT m.*, COUNT(mtln.abbv) AS played
			FROM 
			machine m 
			LEFT JOIN (
				machine_to_league_night mtln
				LEFT JOIN league_night ln USING(starts)
			) USING (abbv, season_id)
			WHERE 
			m.season_id=".$season->season_id." 
			GROUP BY m.abbv
			HAVING played <= ".$times;

		$dbh = PDODB::getInstance();
		$stmt = $dbh->query($sql);
		$machines = $stmt->fetchALL(PDO::FETCH_CLASS, 'Machine');

		return $machines;

	}

	## CLASS FUNCTIONS

	/*
	 *	Make construct protected so it can only be called from ClassName::create()
	*/
	protected function __construct(){}

}

?>