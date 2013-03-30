<?php

class PDODB {

	private static $dbh = null;

	private static function connect() {
		try {
			$dsn = DB_TYPE.":host=".DB_SERVER.";dbname=".DB_NAME;

			self::$dbh = new PDO ( $dsn, DB_USER, DB_PASSWD);
			self::$dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

		} catch(PDOException $e){
			print "Error!: " . $e->getMessage () . "\n" ;
			die () ;
		}
	}

	public static function getInstance() {
		if(!isset(self::$dbh)){
			self::connect();
		}
		
		return self::$dbh;
	}

}

?>