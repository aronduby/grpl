<?php

class PlayerGroupList implements IteratorAggregate, JsonSerializable {

	protected $groups = [];

	public static function getRankings($limit_to = null){

		if($limit_to != null && (
			! $limit_to instanceof Season
			&& ! $limit_to instanceof LeagueNight
		))
			throw new Exception('PlayerGroupListing takes either null, a Season, or a LeagueNight as its constructors argument');

		$sql = "SELECT 
				lns.name_key, 
				SUM( lns.points ) AS points,
				COUNT(IF(lns.points=7,1,null)) AS firsts,
				COUNT(IF(lns.points=5,1,null)) AS seconds,
				COUNT(IF(lns.points=3,1,null)) AS thirds,
				COUNT(IF(lns.points=1,1,null)) AS fourths,
			    COUNT(DISTINCT subs.sub_id) AS subbed
			FROM 
				league_night_score lns
				LEFT JOIN league_night ln USING ( starts )
				LEFT JOIN league_night_sub subs USING( starts, name_key )";

		if($limit_to instanceof LeagueNight){
			$sql .= " WHERE lns.starts < '".$limit_to->starts."' AND ln.season_id = ".intval($limit_to->season_id);
		} elseif($limit_to instanceof Season)
			$sql .= " WHERE ln.season_id = ".intval($limit_to->season_id);

		$sql .= " GROUP BY (lns.name_key) 
			ORDER BY 
				points DESC,
				firsts DESC,
				seconds DESC,
				thirds DESC,
				fourths DESC,
				subbed ASC";

		$stmt = PDODB::getInstance()->query($sql);
		$players = $stmt->fetchAll(PDO::FETCH_OBJ);

		if(count($players) == 0){
			if($limit_to == null)
				throw new Exception('PlayerGroupList failed to return any players without a limiting object');

			$sql = "SELECT name_key, 0 AS points FROM player_to_season WHERE season_id=".intval($limit_to->season_id)." ORDER BY start_order";
			$stmt = PDODB::getInstance()->query($sql);
			$players = $stmt->fetchAll(PDO::FETCH_OBJ);			
		}

		$list = new PlayerGroupList();
		$group = new PlayerGroup();
		$i = 0;
		$offset = 0;
		foreach($players as $r){
			$group->attach(Player::create($r->name_key), $r->points);

			if(++$i == 4){
				$group->offset = $offset;
				$list->groups[] = $group;
				$group = new PlayerGroup();
				$i = 0;
				$offset++;
			}
		}

		// make sure to add our last grouping
		if($group->count() > 0)
			$list->groups[] = $group;

		return $list;
	}

	public static function getPointsForNight(LeagueNight $night){
		$rankings = self::getRankings($night);

		$dbh = PDODB::getInstance();
		$sql = "SELECT abbv, '' AS empty FROM machine_to_league_night WHERE starts='".$night->starts."'";
		$stmt = $dbh->query($sql);
		$stmt->setFetchMode(PDO::FETCH_KEY_PAIR);
		$all_machines = $stmt->fetchAll();

		$sql = "SELECT
			SUM(lns.points) AS points, GROUP_CONCAT(mtln.abbv,':',IFNULL(lns.points,'')) AS machines
		FROM
			machine_to_league_night mtln
			LEFT JOIN league_night_score lns USING(starts, abbv)
		WHERE
			mtln.starts=:starts
			AND (
				lns.name_key = :name_key
				OR lns.name_key IS NULL
			)";

		$stmt = $dbh->prepare($sql);
		$stmt->bindParam(':name_key', $name_key);
		$stmt->bindValue(':starts', $night->starts);

		foreach($rankings as $group){
			foreach($group as $p){
				$name_key = $p->name_key;
				$stmt->execute();
				$r = $stmt->fetch(PDO::FETCH_OBJ);
				if($r == false)
					break;

				$group->setInfo($r->points.' '.$group->getInfo());

				// create and add the machines array
				$machines = [];
					if(strlen($r->machines)){
					foreach(explode(',', $r->machines) as $m){
						list($m_abbv, $m_points) = explode(':', $m);
						$machines[$m_abbv] = $m_points;
					};
				}
				$p->machines = array_merge($all_machines, $machines);
				
				
			}
		}

		return $rankings;
	}




	public function getGroupForPlayer(Player $player){
		foreach($this->groups as $group){
			if($group->contains($player))
				return $group;
		}
	}

	public function getPlaceForPlayer(Player $player){
		$group_number = 0;
		foreach($this->groups as $group){
			if($group->contains($player)){
				break;
			}
			$group_number++;
		}

		$player_number_in_group = 1;
		foreach($group as $p){
			if($player->name_key == $p->name_key)
				break;
			$player_number_in_group++;
		}

		return ($group_number * 4) + $player_number_in_group;
	}

	public function getIterator(){
		return new ArrayIterator($this->groups);
	}

	/*
	 *	Proper JSON format
	*/
	public function jsonSerialize(){

		$data = [];
		foreach($this as $pg){
			$data[] = $pg;
		}

		return $data;
	}
		

}

?>