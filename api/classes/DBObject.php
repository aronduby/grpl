<?php

abstract class DBObject {

	protected $table;
	protected $primary_key;

	static protected $dbh;
	
	static public function create($id){
		self::$dbh = PDODB::getInstance();

		$reflection = new ReflectionClass(get_called_class());
		$properties = $reflection->getProperties(ReflectionProperty::IS_PUBLIC);
		$default_properties = $reflection->getDefaultProperties();

		if(!isset($default_properties['table']) || !isset($default_properties['primary_key']))
			throw new Exception('Class '.__CLASS__.' must have both table and primary key defined');
		
		$flds = [];
		foreach($properties as $p)
			$flds[] = $p->name;		

		$sql = "SELECT 
				".implode(', ', $flds)." 
			FROM 
				".$default_properties['table']." 
			WHERE
				".$default_properties['primary_key']." = ".self::$dbh->quote($id);

		$stmt = self::$dbh->query($sql);
		$stmt->setFetchMode(PDO::FETCH_CLASS, get_called_class());
		return $stmt->fetch();
	}

	public function save(){
		if(!isset($this->table) || !isset($this->primary_key))
			throw new Exception('Class '.__CLASS__.' must have both table and primary key defined');

		$reflection = new ReflectionClass(get_called_class());
		$properties = $reflection->getProperties(ReflectionProperty::IS_PUBLIC);
		
		$sets = [];
		$updates = [];
		foreach($properties as $p){
			$val = $p->getValue($this);

			if(isset($val))
				$sets[] = $p->name." = ".self::$dbh->quote($val);
			else
				$sets[] = $p->name." = NULL";

			$updates[] = $p->name."=VALUES(".$p->name.")";
		}


		$sql = "INSERT INTO 
				".$this->table." 
			SET ".implode(', ', $sets)." 
			ON DUPLICATE KEY UPDATE ".implode(', ', $updates).",
				".$this->primary_key." = LAST_INSERT_ID(".$this->primary_key.")";
		
		self::$dbh->exec($sql);
		$this->{$this->primary_key} = self::$dbh->lastInsertId();
	}



}

?>