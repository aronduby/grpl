<?php

class Player extends DBObject {
	
	public $player_id;
	public $first_name;
	public $last_name;
	public $email;
	public $facebook_id;
	public $admin;
	public $name_key;

	// db info
	protected $table = 'player';
	protected $primary_key = 'name_key';

	## CONTROLLER FUNCTIONS
	public static function getAllForSeason(Season $season){
		
		$sql = "SELECT name_key FROM player_to_season WHERE season_id=".intval($season->season_id)." ORDER BY name_key";

		$dbh = PDODB::getInstance();
		$stmt = $dbh->query($sql);
		$players = [];
		while($name_key = $stmt->fetch(PDO::FETCH_COLUMN))
			$players[] = Player::create($name_key);

		return $players;
	}

	public static function getByFBToken($token){
		$url = 'https://graph.facebook.com/me?access_token='.$token;
		$ch = curl_init($url);
		curl_setopt_array($ch,[
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_SSL_VERIFYPEER => false
		]);
		
		$rsp = json_decode(curl_exec($ch));
		if(isset($rsp->error)){
			throw new Exception(
				$rsp->error->message,
				$rsp->error->code
			);
		} else {
			return self::getByFBID($rsp->id);
		}

	}

	public static function getByFBID($fb_id){
		$dbh = PDODB::getInstance();

		$sql = "SELECT name_key FROM player WHERE facebook_id=".$dbh->quote($fb_id);
		$stmt = $dbh->query($sql);
		$name_key = $stmt->fetch(PDO::FETCH_COLUMN);
		return Player::create($name_key);
	}

	## CLASS FUNCTIONS

	/*
	 *	Make construct protected so it can only be called from Player::create()
	*/
	protected function __construct(){

		$this->admin = (boolean)$this->admin;

	}

}

?>