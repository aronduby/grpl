<?php
class PlayerGroup extends SPLObjectStorage implements JsonSerializable {

	public $offset;

	/*
	 *	Limit attach to only objects which are instances of Player
	*/
	public function attach($obj, $data = null){
		if($obj instanceof Player)
			parent::attach($obj, $data);
		else
			throw new Exception('Can only attach instances of Player to PlayerGroup');
	}

	/*
	 *	Use our name key as the object hash for proper contains
	 *	when it is obviously the same player, but a diff. object
	*/
	public function getHash($player){
		return $player->name_key;
	}

	/*
	 *	Proper JSON format
	*/
	public function jsonSerialize(){

		$data = [];
		foreach($this as $nc){
			/*
			$temp = new StdClass();
			$temp->player = $this->current();
			$temp->total = $this->getInfo();

			$data[] = $temp;
			*/
			$temp = clone $this->current();
			$temp->score = $this->getInfo();
			$data[] = $temp;
		}

		return $data;
	}

	/*
	 *	Gets an array of the supplied field from all of the objects
	*/
	public function pluck($fld){
		$plucked = [];
		foreach($this as $player){
			$plucked[] = $player->$fld;
		}
		return $plucked;
	}
}

?>