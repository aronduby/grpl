var Q = require('q');

/*
 *	Controller Functions
*/
exports.getForSeason = function(season_id){
	var d = Q.defer(),
		list = new PlayerList();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// super long to include if the player already had a sub
		var sql = "SELECT p.*, s.had_sub FROM player p LEFT JOIN player_to_season pts USING(name_key) LEFT JOIN (SELECT name_key, COUNT(*) AS had_sub FROM league_night_sub WHERE night_id IN (SELECT night_id FROM league_night WHERE season_id = ? ) GROUP BY name_key ) s ON( s.name_key = pts.name_key) WHERE pts.season_id=? ORDER BY name_key";
		db.query(sql, [season_id, season_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			results.forEach(function(row){
				list.add(new module.parent.exports.player.Player(row));
			});
			d.resolve(list);
			db.release();
		});
	});

	return d.promise;
};

exports.getActive = function(season_id){
	var d = Q.defer(),
		list = new PlayerList();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// super long to include if the player already had a sub
		var sql = "SELECT p.* FROM player_to_season pts LEFT JOIN player p USING(name_key) WHERE pts.season_id=?";
		db.query(sql, [season_id], function(err, results){
			if(err){ 
				d.reject(err); db.release(); return false; 
			}

			results.forEach(function(row){
				list.add(new module.parent.exports.player.Player(row));
			});
			d.resolve(list);
			db.release();
		});
	});

	return d.promise;
};


exports.getAll = function(season_id){
	var d = Q.defer(),
		list = new PlayerList();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		if(season_id != undefined){
			var sql = "SELECT p.*, IFNULL(MAX(pts.season_id) = "+parseInt(season_id,10)+", 0) AS active FROM player p LEFT JOIN player_to_season pts USING(name_key) GROUP BY (name_key) ORDER BY p.last_name";
		} else {
			var sql = "SELECT p.* FROM player p ORDER BY last_name";	
		}		
		db.query(sql, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			results.forEach(function(row){
				list.add(new module.parent.exports.player.Player(row));
			});
			d.resolve(list);
			db.release();
		});
	});

	return d.promise;
}


exports.getRankings = function(season_id, starts){
	var d = Q.defer(),
		list = new PlayerList(),
		season_id = season_id;

	if(starts == 'totals')
		starts = null;

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT f.*, lnop.rank AS previous_rank, breaker, CONCAT(score,'.',firsts,'.',seconds,'.',thirds,'.',fourths,'.',subbed,'.',IFNULL(breaker,0)) AS scoring_string " +
			"FROM ( " +
				"SELECT  " +
					"p.*,  " +
					"SUM(n.points) AS score,  " +
					"SUM(n.firsts) AS firsts,  " +
					"SUM(n.seconds) AS seconds,  " +
					"SUM(n.thirds) AS thirds,  " +
					"SUM(n.fourths) AS fourths,  " +
					"SUM(n.subbed) AS subbed " +
				"FROM  " +
					"player_to_season pts " +
					"LEFT JOIN player_points_per_night n USING(name_key, season_id) " +
					"LEFT JOIN player p USING(name_key) " +
				"WHERE " +
					"pts.season_id = "+season_id+" " +
					(starts != null ? 'AND starts < \''+starts+'\' ' : '') + 
				"GROUP BY  " +
					"name_key  " +
			") AS f " +
			"LEFT JOIN( " +
				"SELECT " +
					"lno.name_key, lno.rank " +
				"FROM " +
					"league_night ln " +
					"LEFT JOIN league_night_order lno USING(night_id) " +
				"WHERE " +
					"starts = ( " +
						"SELECT " +
							"MAX(ln.starts) " +
						"FROM " +
							"league_night_score lns " +
							"LEFT JOIN league_night ln USING(night_id) " +
						"WHERE " +
							"season_id="+season_id+" " +
							"AND starts < " + (starts != null ? "'"+starts+"'" : 'NOW()') +
					") " +
			") AS lnop USING(name_key) " +
			"LEFT JOIN (  " +
				"SELECT  " +
					"tb.name_key, tb.place AS breaker " +
				"FROM  " +
					"league_night n " +
					"JOIN tie_breaker tb USING(night_id)  " +
				"WHERE  " +
					"n.starts = "+(starts != null ? "'"+starts+"' " : "0 ") +
			") AS tb USING(name_key) " +
			"ORDER BY  " +
				"score DESC, " +
				"firsts DESC, " +
				"seconds DESC, " +
				"thirds DESC, " +
				"fourths DESC, " +
				"subbed ASC, " +
				"breaker ASC, " +
				"last_name ASC";

		db.query(sql, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			if(results.length > 0){
				var start_order = 0,
					grouping = 0,
					rank = 1,
					prev_scoring_string = '';

				results.forEach(function(r){
					if(r.scoring_string != prev_scoring_string){
						rank = start_order + 1;
					}

					r.rank = rank;
					r.start_order = start_order;
					r.grouping = grouping;
					list.add(new module.parent.exports.player.Player(r));
					
					if(start_order %4 == 3)
						grouping++;
					
					prev_scoring_string = r.scoring_string;
					start_order++;					
				});
				d.resolve(list);
				db.release();
			}
			else {
				var sql = '';
				if(starts != undefined && starts != null){
					sql = "SELECT " +
							"p.*, 0 AS score " +
						"FROM " +
							"league_night ln, " +
							"player_to_season pts, " +
							"player p " +
						"WHERE  " +
							"ln.starts='"+starts+"' " +
							"AND ln.season_id = pts.season_id " +
							"AND pts.name_key = p.name_key " +
							"ORDER BY " +
								"pts.start_order";
				} else {
					sql = "SELECT " +
							"p.*, 0 AS score " +
						"FROM " +
							"player_to_season pts, " +
							"player p " +
						"WHERE " +
							"pts.season_id = "+season_id+" " +
							"AND pts.name_key = p.name_key " +
						"ORDER BY " +
								"pts.start_order, p.last_name";
				}
				var query = db.query(sql, function(err, results){
					if(err){ d.reject(err); db.release(); return false; }

					var i = 1;
					results.forEach(function(row){
						row.place = i;
						list.add(new module.parent.exports.player.Player(row));
						i++;
					});
					d.resolve(list);
					db.release();
				});
			}
		});
	});

	return d.promise;
}

exports.getTies = function(season_id, starts){
	var d = Q.defer();

	exports.getRankings(season_id, starts)
	.then(function(player_list){

		var all_ties = [],
			cur_tie = [],
			cur_string = false;

		player_list.players.forEach(function(player){
			if(player.scoring_string != null && (player.scoring_string == cur_string || cur_string == false)){
				cur_tie.push(player);
			} else {
				if(cur_tie.length > 1){
					all_ties.push(cur_tie);
				}
				cur_tie = [player];

			}
			cur_string = player.scoring_string;
		});

		if(cur_tie.length > 1)
			all_ties.push(cur_tie);

		d.resolve(all_ties);

	}).fail(function(err){
		d.reject(err);
	}).done();

	return d.promise;
}

exports.getOrderForNight = function(season_id, starts){
	var d = Q.defer(),
		list = new PlayerList();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// rankings query but ordered by the lno
		var sql = "SELECT " +
			"lno.rank, lnop.rank AS previous_rank, lno.start_order, lno.grouping, lno.dnp, p.*, IFNULL(f.score, 0) AS score, IFNULL(CONCAT(score,'.',firsts,'.',seconds,'.',thirds,'.',fourths,'.',subbed,'.',IFNULL(breaker,0)),0) AS scoring_string " +
		"FROM " +
		"league_night n " +
		"LEFT JOIN league_night_order lno USING(night_id) " +
		"LEFT JOIN player p USING(name_key) " +
		"LEFT JOIN ( " +
			"SELECT " +
				"n.name_key, " +
				"SUM(n.points) AS score, " +
				"SUM(n.firsts) AS firsts, " +
				"SUM(n.seconds) AS seconds, " +
				"SUM(n.thirds) AS thirds, " +
				"SUM(n.fourths) AS fourths, " +
				"SUM(n.subbed) AS subbed " +
			"FROM " +
				"player_points_per_night n " +
			"WHERE season_id = ? " +
				"AND starts < ? " +
			"GROUP BY " +
				"name_key " +
		") AS f USING(name_key) " +
		"LEFT JOIN ( " +
			"SELECT " +
				"lno.name_key, lno.rank " +
			"FROM " +
				"league_night ln " +
				"LEFT JOIN league_night_order lno USING(night_id) " +
			"WHERE " +
				"ln.season_id = ? " +
				"AND ln.starts = (SELECT MAX(starts) FROM league_night WHERE starts < ?) " +
			"ORDER BY " +
				"ln.starts DESC " +
		") AS lnop USING(name_key) " +
		"LEFT JOIN ( " +
			"SELECT " +
				"tb.name_key, tb.place AS breaker " +
			"FROM " +
				"league_night n " +
				"JOIN tie_breaker tb USING(night_id) " +
			"WHERE " +
				"n.starts = ? " +
		") AS tb USING(name_key) " +
		"WHERE " +
			"n.starts = ? " +
		"ORDER BY " +
			"lno.start_order";
		db.query(sql, [season_id, starts, season_id, starts, starts, starts], function(err, results){
			if(err){ err.sql = sql; d.reject(err); db.release(); return false; }

			results.forEach(function(row){
				list.add(new module.parent.exports.player.Player(row));
			});
			d.resolve(list);
			db.release();
		});
	});

	return d.promise;
};

exports.getPointsForNight = function(season_id, starts){
	var d = Q.defer();

	exports.getOrderForNight(season_id, starts)
	.then(function(player_list){
			
			// get all of the points for the night that are already in the database
			getPool().getConnection(function(err, db){
				if(err){ d.reject(err); return false; }
				
				// TODO - remove shitty hack
				// also, why do these use pts?
				if(season_id < 6){
					var sql = "SELECT " +
							"lns.name_key, SUM(lns.points) AS points, GROUP_CONCAT(lns.abbv,':',IFNULL(lns.points,'') ORDER BY lns.played_order) AS machines " +
						"FROM " +
							"player_to_season pts " +
							"JOIN league_night n USING(season_id) " +
							"JOIN league_night_score lns USING(name_key, night_id) " +
						"WHERE n.starts = ? " +
						"GROUP BY lns.name_key " +
						"ORDER BY lns.name_key";
				} else {
					var sql = "SELECT " +
							"lns.name_key, SUM(lns.points) AS points, " + 
							"GROUP_CONCAT(" +
								"'abbv:',lns.abbv,','," +
								"'points:',IFNULL(lns.points,''),','," +
								"'played_order:',lns.played_order " +
								"ORDER BY lns.played_order " +
								"SEPARATOR ';' " +
							") AS machines " +
						"FROM " +
							"player_to_season pts " +
							"JOIN league_night n USING(season_id) " +
							"JOIN league_night_score lns USING(name_key, night_id) " +
						"WHERE n.starts = ? " +
						"GROUP BY lns.name_key " +
						"ORDER BY lns.name_key";
				}

				db.query(sql, [starts], function(err, results){
					if(err){ d.reject(err); db.release(); return false; }

					var player_night = {};

					if(results.length > 0){						
						results.forEach(function(r){
							var obj = {
								points: r.points,
								machines: {}
							};

							// TODO - remove shitty hack
							if(season_id < 6){
								r.machines.split(',').forEach(function(part){
									var s = part.split(':');
									obj.machines[s[0]] = s[1];
								});
							} else {
								obj.machines = [];
								r.machines.split(';').forEach(function(m){
								    var props = m.split(','),
								        mobj = {};

								    props.forEach(function(prop){
								        var p = prop.split(':');
								        mobj[p[0]] = isNaN(p[1]) ? p[1] : p[1]*1;
								    });

								    obj.machines[mobj.played_order] = mobj;
								});
							}
							
							player_night[r.name_key] = obj;				
						});
					}

					// loop through all of our players and add their player_night info					
					player_list.players.forEach(function(player){
						if(player_night[player.name_key] == undefined){
							// TODO - remove shitty hack
							if(season_id < 6){
								player.machines = {};	
							} else {
								player.machines = [];
							}
							
							player.night_score = 0;
						} else {
							player.machines = player_night[player.name_key].machines;
							player.night_score = player_night[player.name_key].points;
						}
					});
					

					d.resolve(player_list);
					db.release();
				});
			});

		}
	).fail(function(err){
		console.log(err);
	})

	return d.promise;
}


exports.createStartOrderForNight = function(season_id, starts){
	var all_done = Q.defer(),
		previous_night = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ all_done.reject(err); return false; }

		var sql = "SELECT " +
				"DATE_FORMAT(starts, '%Y-%m-%d') AS starts, season_id " +
			"FROM " +
				"league_night " +
			"WHERE " +
				"starts < ? " +
			"ORDER BY " +
				"starts DESC " +
			"LIMIT 1";

		db.query(sql, [starts], function(err, results){
			if(err){ all_done.reject(err); db.release(); return false; }

			if(results.length == 1){
				previous_night.resolve(results[0]);
			} else {
				previous_night.reject();
			}
			db.release();
		});
	});

	previous_night.promise
	.then(function(night){
		getPool().getConnection(function(err, db){
			if(err){ all_done.reject(err); return false; }

			var sql = "SELECT " +
					"pfts.name_key, " +
					"CONCAT(score,'.',firsts,'.',seconds,'.',thirds,'.',fourths,'.',subs) AS scoring_string " +
				"FROM " +
					"( " +
						"SELECT  " +
							"pts.name_key  " +
						"FROM  " +
							"player_to_season pts  " +
							"LEFT JOIN player p USING(name_key) " +
						"WHERE  " +
							"pts.season_id = ?  " +
						"ORDER BY  " +
							"p.last_name " +
					") AS pfts " +
					"LEFT JOIN (  " +
						"SELECT   " +
							"p.name_key, " +
							"p.last_name, " +
							"p.first_name, " +
							"SUM(n.points) AS score,  " +
							"SUM(n.firsts) AS firsts, " +
							"SUM(n.seconds) AS seconds, " +
							"SUM(n.thirds) AS thirds, " +
							"SUM(n.fourths) AS fourths, " +
							"SUM(n.subbed) AS subs " +
						"FROM " +
							"player_points_per_night n " +
							"LEFT JOIN player p USING(name_key) " +
						"WHERE " +
							"season_id = ? " +
							"AND starts <= ? " +
						"GROUP BY " +
							"name_key " +
					") AS f USING(name_key) " +
				"ORDER BY " +
					"score DESC, " +
					"firsts DESC, " +
					"seconds DESC, " +
					"thirds DESC, " +
					"fourths DESC, " +
					"subs ASC, " +
					"last_name, " +
					"first_name ";

			db.query(sql, [season_id, night.season_id, night.starts], function(err, results){
				if(err){ console.log(err); all_done.reject(err); db.release(); return false; }
				all_done.resolve(results);
				db.release();
			});
		});
	})
	.fail(function(){
		getPool().getConnection(function(err, db){
			if(err){ console.log(err); all_done.reject(err); return false; }

			var sql = "SELECT " +
					"pts.name_key, '0' AS scoring_string " +
				"FROM " +
					"player_to_season pts " +
					"LEFT JOIN player p USING(name_key) "+
				"WHERE " +
					"pts.season_id = ? " +
				"ORDER BY " + 
					"p.last_name, p.first_name";

			db.query(sql, [season_id], function(err, results){
				if(err){ all_done.reject(err); db.release(); return false; }
				all_done.resolve(results);
				db.release();
			});
		});
	}).done();

	return all_done.promise;
}


function getPool(){ return module.parent.exports.pool; }

/*
 *	Actual Object
*/
exports.PlayerList = PlayerList;
function PlayerList(opts){
	for(prop in opts){
		if (prop in this) {
			this[prop] = opts[prop];
		}
	}
	this.clear();
}

PlayerList.prototype.players = [];
PlayerList.prototype.order = null;
PlayerList.prototype.clear = function(){
	this.players = [];
}
PlayerList.prototype.add = function(player){
	this.players.push(player);
}
PlayerList.prototype.getPlaceForPlayer = function(name_key){
	for(var i in this.players){
		if(this.players[i].name_key == name_key)
			return (Number(i) + 1);
	}
	return false;
}
PlayerList.prototype.getPlayer = function(name_key){
	for(var i in this.players){
		if(this.players[i].name_key == name_key){
			return this.players[i];
		}
	}
	return false;	
}
PlayerList.prototype.getGroupForPlayer = function(name_key){
	var group = new PlayerList(),
		place = this.getPlaceForPlayer(name_key) - 1,
		start = place - (place % 4),
		end = start + 4, // not inclusive
		sliced = this.players.slice(start, end);

	group.order = start/4;

	sliced.forEach(function(player){
		group.add(player);
	});

	return group;
}