var Q = require('q'),
	moment = require('moment'),
	_ = require('underscore');

/*
 *	Controller Functions
*/
exports.getByStarts = function(starts){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); db.release(); return false; }
		var sql = "SELECT " +
				"ln.*, DATE_FORMAT(ln.starts, '%Y-%m-%d') AS starts, COUNT(lns.score_id) > 0 AS scored " +
			"FROM " +
				"league_night ln " +
				"LEFT JOIN league_night_score lns USING(night_id) " +
			"WHERE " +
				"ln.starts = ?";

		db.query(sql, [starts], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			if(results.length == 0)
				d.reject('No league night found on that date');

			var night = new LeagueNight(results[0]);
			
			// get the subs			
			var sub_sql = "SELECT lnsub.*, CONCAT(p.first_name,' ',p.last_name) AS player " +
				"FROM league_night_sub lnsub " +
				"LEFT JOIN player p USING(name_key) " +
				"WHERE night_id=?";

			db.query(sub_sql, [night.night_id], function(err, rows){
				if(err){ d.reject(err); db.release(); return false; }

				var obj = {};
				rows.forEach(function(r){
					obj[r.name_key] = r;
				});
				night.subs = obj;

				d.resolve(night);
				db.release();
			});
		});
	});

	return d.promise;
}


exports.getAllForSeason = function(season_id){
	var d = Q.defer(),
		nights = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT " +
				"ln.*, DATE_FORMAT(ln.starts, '%Y-%m-%d') AS starts, COUNT(lns.score_id) > 0 AS scored " +
			"FROM " +
				"league_night ln " +
				"LEFT JOIN league_night_score lns USING(night_id) " +
			"WHERE " +
				"ln.season_id=? " +
			"GROUP BY " + 
				"lns.night_id " + 
			"ORDER BY " +
				"ln.starts DESC";

		db.query(sql, [season_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			results.forEach(function(row){
				nights.push(new LeagueNight(row));
			});
			db.release();
			d.resolve(nights);
		});
	});

	return d.promise;
}



function getPool(){ return module.parent.exports.pool; }
function nl2br(str, is_xhtml){
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>'; // Adjust comment to avoid issue on phpjs.org display
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

/*
 *	Actual Object
*/
exports.LeagueNight = LeagueNight;
function LeagueNight(opts){
	for(prop in opts){
		if (prop in this) {
			this[prop] = opts[prop];
		}
	}

	if(this.note != null)
		this.note = nl2br(this.note);

	if(this.starts == 'totals'){
		this.description = 'running totals for the season';
	}

	this.scored = !!this.scored;

}
LeagueNight.prototype.night_id = null;
LeagueNight.prototype.season_id = null;
LeagueNight.prototype.title = null;
LeagueNight.prototype.starts = null;
LeagueNight.prototype.description = null;
LeagueNight.prototype.note = null;
LeagueNight.prototype.has_order = 0;
LeagueNight.prototype.divisions = null;
LeagueNight.prototype.subs = null;
LeagueNight.prototype.scored = null;

LeagueNight.prototype.save = function(){
	var self = this,
		d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var ln_data = {
			'night_id': self.night_id,
			'season_id': self.season_id,
			'title': self.title,
			'description': moment(self.starts).format('MMMM Do, YYYY'),
			'starts': self.starts,
			'note': self.note,
			'has_order': self.has_order
		};

		var query = db.query("INSERT INTO league_night SET ? ON DUPLICATE KEY UPDATE ?", [ln_data, ln_data], function(err, result) {
			if(err){ d.reject(err); db.release(); return false; }
			
			if(!self.night_id && result.insertId)
				self.night_id = result.insertId;


			// check/create the start order for this night
			db.query("SELECT COUNT(*) AS order_exists FROM league_night_order WHERE night_id = ?", [self.night_id], function(err, result){
				if(err){ d.reject(err); db.release(); return false; }

				if(result[0].order_exists > 0){
					if(!self.has_order){
						self.has_order = true;
						self.save();
					}
					// the order already exists resolve
					d.resolve(self);
					db.release();
				} else {

					module.parent.exports.playerlist.createStartOrderForNight(self.season_id, self.starts)
					.then(function(order){
						var rank = 0,
							start_order = 0,
							grouping = 0,
							prev_scoring_string = '',
							sets = [];

						order.forEach(function(r){
							if(r.scoring_string != prev_scoring_string){
								rank = start_order + 1;
							}

							sets.push([
								self.night_id,
								r.name_key,
								rank,
								start_order,
								grouping
							]);
							
							if(start_order %4 == 3)
								grouping++;
							
							prev_scoring_string = r.scoring_string;
							start_order++;
						});

						// inject division
						injectDivision(self.season_id, sets, 4)
						.then(function(sets){

							var query = db.query("INSERT INTO league_night_order (`night_id`, `name_key`, `rank`, `start_order`, `grouping`, `division_id`) VALUES ?", [sets], function(err, results){
								if(err){ d.reject(err); db.release(); return false; }
								self.has_order = 1;
								self.save()
								.then(function(){
									self.has_order = true;
									self.save();

									d.resolve(self);
									db.release();
								})
								.fail(function(err){
									console.log(err);
									d.reject(err);
									db.release();
								}).done();
							});

						})
						.fail(function(err){
							d.reject(err);
						}).done();					


					}).fail(function(err){
						console.log(err);
						d.reject(err);
						return false;
					}).done();
				}
			});
			
		});
	});

	return d.promise;
}


LeagueNight.prototype.saveOrder = function(data){
	var self = this,
		d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("DELETE FROM league_night_order WHERE night_id = ?", [data.night_id], function(err, result){
			if(err){ d.reject(err); db.release(); return false; }

			var sets = [],
				season_id = data.season_id,
				night_id = data.night_id;

			data.order.forEach(function(p){
				sets.push([
					night_id,
					p.name_key,
					p.rank,
					p.start_order,
					p.grouping,
					p.dnp
				]);
			});

			// inject division
			injectDivision(self.season_id, sets, 4)
			.then(function(sets){
				var sql = "INSERT INTO league_night_order (night_id, name_key, rank, start_order, grouping, dnp, division_id) VALUES ?";
				db.query(sql, [sets], function(err, results){
					if(err){ d.reject(err); db.release(); return false; }
					d.resolve(results);
					db.release();
				});
			})
			.fail(function(err){
				d.reject(err);
				db.release();
			}).done();			
			
		});
	});

	return d.promise;
}

function injectDivision(season_id, sets, group_by_key){

	return Q.promise(function(resolve, reject, notify){

		module.parent.exports.division.getBasicDataForSeason(season_id)
		.then(function(divisions){

			if(divisions.length == 1){
				_.each(sets, function(set){
					set.push(divisions[0].division_id);
				});

			} else {
				var groups = _.chain(sets).groupBy(group_by_key).values().value();
				var split_amongst = [];

				_.each(divisions, function(division){
					if(division.cap){
						var tmp = groups.splice(0, division.cap);
						_.each(tmp, function(group){
							_.each(group, function(arr){
								arr.push(division.division_id);
							});
						});
					} else {
						split_amongst.push(division);
					}
				});

				var per_division = Math.ceil( groups.length / split_amongst.length );
				_.each(split_amongst, function(division){
					var tmp = groups.splice(0, per_division);
					_.each(tmp, function(group){
						_.each(group, function(arr){
							arr.push(division.division_id);
						});
					});
				});
			}

			resolve(sets);

		})
		.fail(function(err){
			reject(err);
		});

	});

}


/*
 *	Managing scores for a past night
*/
LeagueNight.prototype.getScores = function(){
	var self = this,
		d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT " + 
				"lns.score_id, lno.night_id, lno.name_key, lns.abbv, lns.points, lns.played_order, lno.grouping, lno.start_order, lno.division_id, mtln.mtln_id, mtln.picked_by "+
			"FROM " + 
				"league_night_order lno " +
				"LEFT JOIN league_night_score lns USING(night_id, name_key) " +
				"LEFT JOIN machine_to_league_night mtln USING(night_id, abbv, grouping) " + 
			"WHERE " + 
				"night_id = ? " + 
			"ORDER BY " + 
				"lno.grouping, lno.start_order, lns.played_order";

		db.query(sql, [self.night_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			d.resolve(results);
			db.release();
		});
	});

	return d.promise;
}

LeagueNight.prototype.saveScores = function(data){
	var self = this,
		d = Q.defer(),
		score_sets = [],
		machine_sets = [],
		machine_ids = [];

	data.scores.forEach(function(score){
		// add to the score sets
		score_sets.push([
			score.score_id,
			score.night_id,
			score.name_key,
			score.abbv,
			score.points,
			score.played_order
		]);

		// check the machine ids
			// can't use mtln_id or abbv seperately due to adding machines
			// or maybe a league later says you can play the same machine twice in a night
		// if its not there add it to the machine sets
		if(machine_ids.indexOf(score.abbv+':'+score.mtln_id) < 0){
			machine_sets.push([
				score.mtln_id,
				score.night_id,
				score.grouping,
				score.abbv,
				score.picked_by,
				score.division_id
			]);
			machine_ids.push(score.abbv+':'+score.mtln_id);
		}
	});

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// insert/update scores
		var score_promise = Q.promise(function(resolve, reject, notify){
			if(score_sets.length == 0){
				resolve(true);
				return true;
			}

			var sql = "INSERT INTO league_night_score (score_id, night_id, name_key, abbv, points, played_order) VALUES ? ON DUPLICATE KEY UPDATE abbv=VALUES(abbv), points=VALUES(points), played_order=VALUES(played_order)";
			db.query(sql, [score_sets], function(err, results){
				if(err){ reject(err); return false; }

				resolve(results);
			});		
		});

		// insert/update machines
		var machine_promise = Q.promise(function(resolve, reject, notify){
			if(machine_sets.length == 0){
				resolve(true);
				return true;
			}

			var sql = "INSERT INTO machine_to_league_night (mtln_id, night_id, grouping, abbv, picked_by, division_id) VALUES ? ON DUPLICATE KEY UPDATE abbv=VALUES(abbv), picked_by=VALUES(picked_by)";
			db.query(sql, [machine_sets], function(err, results){
				if(err){ reject(err); return false; }

				resolve(results);
			});
		});

		// delete old scores
		var delete_scores_promise = Q.promise(function(resolve, reject, notify){
			if(data.delete.scores.length > 0){
				var sql = "DELETE FROM league_night_score WHERE score_id IN (?)";
				db.query(sql, [data.delete.scores], function(err, results){
					if(err){ reject(err); return false; }

					resolve(results);
				});
			} else {
				resolve(true);
			}
		});

		// delete old machines
		var delete_mtln_promise = Q.promise(function(resolve, reject, notify){
			if(data.delete.mtln.length > 0){
				var sql = "DELETE FROM machine_to_league_night WHERE mtln_id IN (?)";
				db.query(sql, [data.delete.mtln], function(err, results){
					if(err){ reject(err); return false; }

					resolve(results);
				});
			} else {
				resolve(true);
			}
		});

		Q.all([score_promise, machine_promise, delete_scores_promise, delete_mtln_promise])
		.then(function(s, m, ds, dm){
			d.resolve(true);
		})
		.fail(function(err){
			d.reject(err);
		})
		.fin(function(){
			db.release();
		});
	});	

	return d.promise;
}