<?php

class LeagueNight extends DBObject {
	
	public $night_id;
	public $season_id;
	public $title;
	public $starts;
	public $note;

	protected $substitutes;

	// db info
	protected $table = 'league_night';
	protected $primary_key = 'starts';


	## CONTROLLER FUNCTIONS
	public static function getAllForSeason(Season $season, $order_by='DESC'){
		
		$sql = "SELECT 
			starts 
		FROM
			league_night 
		WHERE 
			season_id=".intval($season->season_id)." 
		ORDER BY 
			starts ".$order_by;

		$dbh = PDODB::getInstance();
		$stmt = $dbh->query($sql);
		$nights = [];
		while($starts = $stmt->fetch(PDO::FETCH_COLUMN))
			$nights[] = LeagueNight::create($starts);

		return $nights;

	}

	## CLASS FUNCTIONS

	/*
	 *	Make construct protected so it can only be called from ClassName::create()
	*/
	protected function __construct(){
		$this->note = nl2br($this->note);
	}

	public function getMachines(){
		return Machine::getForLeagueNight($this);
	}

	public function getSubs(){
		if(isset($this->substitutes))
			return $this->substitutes;

		// get the subs
		$sql = "SELECT lnsub.*, CONCAT(p.first_name,' ',p.last_name) AS player FROM league_night_sub lnsub LEFT JOIN player p USING(name_key) WHERE starts='".$this->starts."'";
		$stmt = self::$dbh->query($sql);
		$this->substitutes = $stmt->fetchAll(PDO::FETCH_OBJ);

		return $this->substitutes;
	}

}

?>