<?php

class Season extends DBObject {
	
	public $season_id;
	public $title;


	// db info
	protected $table = 'season';
	protected $primary_key = 'season_id';

	/*
	 *	Make construct protected so it can only be called from ClassName::create()
	*/
	protected function __construct(){}

}

?>