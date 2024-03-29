var Q = require('q'),
	redis = require('redis'),
	client = redis.createClient(),
	logger = require('tracer').colorConsole();

// socket.io redis store keeps everything in database 0
// switch this over to database 1 so that we can flush as needed
// without screwing with socket or messing up data entry
client.select(1);
client.on('error', function(err){
	logger.error(err.stack);
});

/*
 *	Property GETTERS, pull everything from Redis since it's going to be clustered
*/
exports.started = function(){
	var d = Q.defer();
	client.get('started', function(err, data){
		if(err){ d.resolve(false); return false; }
		d.resolve(data=="1");
	});
	return d.promise;
};

exports.starts = function(){
	var d = Q.defer();
	client.get('starts', function(err, data){
		if(err){ d.reject(err); return false; }
		d.resolve(data);
	});
	return d.promise;
};

exports.night_id = function(){
	var d = Q.defer();
	client.get('night_id', function(err, data){
		if(err){ d.reject(err); return false; }
		d.resolve(data);
	});
	return d.promise;
};

exports.getMachines = function(){
	var d = Q.defer(),
		d2 = Q.defer(),
		multi = client.multi();

	Q.ninvoke(client, 'lrange', 'machineorder:order', 0, -1)
	.then(function(keys){	
		keys.forEach(function(key){
			multi.hgetall(key);
		});

		multi.exec(function(err, results){
			if(err){ d.reject(err); return false;}
			var machines = [];

			results.forEach(function(r){
				machines.push(r);
			});

			d.resolve(machines);
		});
	})
	.fail(function(err){
		d.reject(err);
	}).done();

	return d.promise;
};

// private function to get player machines
// done this way to get around callback and scope issues
function getPlayerMachines(player, score_keys){
	var d = Q.defer(),
		promises = [];

	score_keys.forEach(function(score_key){
		promises.push(Q.ninvoke(client, 'hgetall', score_key));
	});

	Q.all(promises)
	.spread(function(){
		for(var i=0, j=arguments.length; i<j; i++){
			var r = arguments[i];
			r.points = parseInt(r.points, 10);
			r.played_order = parseInt(r.played_order, 10);
			player.machines.push(r);
			player.night_score += r.points;
		}
		d.resolve();
	});

	return d.promise;
}

exports.getPlayers = function(){
	var d = Q.defer(),
		players = [],
		promises = [];

	var multi = client.multi();
	client.zrevrange('playerorder', 0, -1, function(err, name_keys){
		if(err){ throw new Error(err) }
		
		name_keys.forEach(function(name_key){
			multi.hgetall('player:'+name_key);
			multi.zrange('player:'+name_key+':scores:order', 0, -1);
		});

		multi.exec(function(err, results){
			if(err){ d.reject(err); return false;}

			// results of the calls will come back stacked
			// 0 => player 	1 => player[0] score keys
			// 2 => player 	3 => player[2] score keys
			// etc.
			var i = 0;
			while(i < results.length){
				var player = results[i],
					score_keys = results[++i];

				player.machines = [];
				player.night_score = 0;

				if(score_keys.length){
					promises.push(getPlayerMachines(player, score_keys));
				}

				players.push(player);
				i++;
			}

			Q.all(promises)
			.then(function(){
				d.resolve(players);
			})
			.fail(function(err){
				d.reject(err);
			})
			.done();
		});
	});

	return d.promise;
};

/*
 *	All of this data is coming from Redis, which treats everything as string
 *	So take pains to go through and convert anyhing that shouldn't be a string
 *
*/
exports.getDivisions = function(){
	var all_done = Q.defer(),
		div_query = Q.defer(),
		div_load = Q.defer(),
		multi = client.multi();

	// this gets all the ids and prepares the full query
	client.lrange('division', 0, -1, function(err, divs){
		if(err){ console.log(err); all_done.reject(err); return false; }
		divs.forEach(function(div_id){
			multi.hgetall('division:'+div_id);
			div_query.resolve();
		});		
	});

	div_query.promise.then(function(){
		multi.exec(function(err, divs){
			if(err){ console.log(err); all_done.reject(err); return false; }
			var divisions = {};
			divs.forEach(function(d){
				d.cap = parseInt(d.cap, 10);
				if(isNaN(d.cap))
					d.cap = null;

				d.display_order = parseInt(d.display_order, 10);
				d.division_id = parseInt(d.division_id, 10);
				d.season_id = parseInt(d.season_id, 10);

				d.machines = [];
				d.player_list = { players:[] };
				divisions[d.division_id] = d;				
			});
			div_load.resolve(divisions);
		});
	});

	Q.all([div_load.promise, exports.getMachines(), exports.getPlayers()])
	.spread(function(divisions, machines, players){

		machines.forEach(function(m){
			if(divisions[m.division_id].machines.indexOf(m.abbv) < 0)
				divisions[m.division_id].machines.push(m.abbv);
		});


		players.forEach(function(p){
			p.dnp = (p.dnp === 'true');
			p.had_sub = (p.had_sub === 'true');
			p.grouping = parseInt(p.grouping, 10);
			p.night_score = parseInt(p.night_score, 10);
			p.player_id = parseInt(p.player_id, 10);
			p.previous_rank = parseInt(p.previous_rank, 10);
			p.previous_rank = parseInt(p.previous_rank, 10);
			p.role  = parseInt(p.role, 10);
			p.score = parseInt(p.score, 10);
			p.start_order = parseInt(p.start_order, 10);

			divisions[p.division_id].player_list.players.unshift(p);
		});

		all_done.resolve(divisions);
	})
	.fail(function(err){
		console.log(err);
		all_done.reject(err);
	})
	.done();


	return all_done.promise;
};


/*
 *	 PUBLIC FUNCTIONS
*/
exports.start = function(season_id, starts){
	var d = Q.defer();

	// check if we're already started
	this.started()
	.then(function(started){
		if(started == true){
			exports.resolveWithData(d);
		} else {

			// make sure we don't have any ties
			module.parent.exports.playerlist.getTies(season_id, starts)
			.then(function(ties){

				if(ties.length > 0){
					d.reject({msg: 'You must resolve all the ties before you can start scoring'});
					return false;
				}

				module.parent.exports.leaguenight.getByStarts(starts)
				.then(function(night){

					var resolveWith = {
						'started': true,
						'starts': starts,
						'night_id': night.night_id,
						'divisions': {},
						'players': []
					};
										
					module.parent.exports.division.getPointsForNight(night.season_id, starts, false)
					.then(function( divisions ){
						
						divisions.forEach(function(division){
							resolveWith.divisions[ division.division_id ] = division;

							client.rpush('division', division.division_id);
							client.hmset('division:'+division.division_id, division);

							// setup the players
							division.player_list.players.forEach(function(player){
								player.division_id = division.division_id;
								resolveWith.players.push( player );

								client.zadd('playerorder', player.start_order, player.name_key);
								client.zadd('group:'+player.grouping, player.start_order, player.name_key);
								client.zadd('division:'+player.division_id+':groups', player.grouping, player.grouping);
								client.hmset('player:'+player.name_key, player);

								player.machines.forEach(function(machine){
									var key = 'player:'+player.name_key+':scores:'+machine.played_order;
									machine.name_key = player.name_key;
									client.hmset(key, machine);
									client.zadd('player:'+player.name_key+':scores:order', machine.played_order, key);
								});	
							});

							// setup the "division" machines (if there are any)
							division.machines.forEach(function(machine){
								var key = 'machineorder:'+division.division_id+':'+machine.grouping,
									mac = {
										division_id: division.division_id,
										abbv: machine.abbv,
										picked_by: machine.picked_by,
										grouping: machine.grouping
									};

								client.hmset(key+':'+machine.played_order, mac);
								client.zadd(key+':order', machine.played_order, key+':'+machine.played_order);
								client.lpush('machineorder:order', key+':'+machine.played_order);
							});
						});

						client.set('starts', starts);
						client.set('night_id', night.night_id);
						client.set('started', '1');
						d.resolve(resolveWith);


					}).fail(function(err){ 
						d.reject(err); 
					}).done();

				}).fail(function(err){ 
					d.reject(err); 
				}).done();


			})
			.fail(function(err){
				d.reject(err);
			}).done();

		}
	}).fail(function(err){ 
		d.reject(err); 
	});

	return d.promise;
};

exports.stop = function(){
	var all_done = Q.defer(),
		scores_done = Q.defer(),
		machines_done = Q.defer(),
		multi = client.multi(),
        night_id;

	// get the night id
	var night_promise = Q.ninvoke(client, 'get', 'night_id');
    night_promise.then(function(id){
       night_id = id;
    });

	// get all of the keys that contain scores
	var score_keys_promise = Q.promise(function(resolve, reject, notify){
		client.zrange('playerorder', 0, -1, function(err, name_keys){
			if(err){ reject(err); return false; }

			name_keys.forEach(function(name_key){
				multi.zrange('player:'+name_key+':scores:order', 0, -1);
			});

			multi.exec(function(err, score_keys){
				if(err){ reject(err); return false; }
				
				var sks = [];
				score_keys.forEach(function(sk){
					sks = sks.concat(sk);
				});
				
				resolve(sks);		
			});
		});
	});

	// get all of the machine data
	var machines_promise = Q.promise(function(resolve, reject, notify){
		client.lrange('machineorder:order', 0, -1, function(err, machine_keys){
			if(err){ reject(err); return false; }

			var multi = client.multi();
			machine_keys.forEach(function(mk){
				multi.hgetall(mk);
			});

			multi.exec(function(err, machines){
				if(err){ reject(err); return false; }
				resolve(machines);				
			});
		});
	});


	// write the scores to the database
	Q.all([night_promise, score_keys_promise])
	.spread(function(night_id, score_keys){
		var sql = "REPLACE INTO league_night_score (night_id, name_key, abbv, points, played_order) VALUES (?, ?, ?, ?, ?)",
			multi = client.multi();

		score_keys.forEach(function(score_key){
			multi.hgetall(score_key);
		});

		multi.exec(function(err, results){
			var write_promises = [];
			results.forEach(function(r){
				write_promises.push(Q.promise(function(resolve, reject, notify){
					getPool().getConnection(function(err, db){
						if(err){ reject(err); return false; }

						// insert the scores
						db.query(sql, [night_id, r.name_key, r.abbv, r.points, r.played_order], function(err, res){
							if(err){ reject(err); return false; }

							db.release();
							resolve(true);
						});
					});
				}));				
			});

			Q.all(write_promises)
			.then(function(){
				scores_done.resolve(true);
			})
			.fail(function(err){
				scores_done.reject(err);
			}).done();

		});
	})
	.fail(function(err){
		scores_done.reject(err);
	}).done();


	// write the machines to the database
	Q.all([night_promise, machines_promise])
	.spread(function(night_id, machines){
		var sql = "REPLACE INTO machine_to_league_night (night_id, division_id, picked_by, abbv, grouping) VALUES (?, ?, ?, ?, ?)";

		var write_promises = [];
		machines.forEach(function(m){
			write_promises.push(Q.promise(function(resolve, reject, notify){
				getPool().getConnection(function(err, db){
					if(err){ reject(err); return false; }
					// insert the machines
					db.query(sql, [night_id, m.division_id, m.picked_by, m.abbv, m.grouping], function(err, res){
						if(err){ reject(err); return false; }
						db.release();
						resolve(true);
					});
				});
			}));				
		});

		Q.all(write_promises)
		.then(function(){
			machines_done.resolve(true);
		})
		.fail(function(err){
			machines_done.reject(err);
		}).done();

	})
	.fail(function(err){
		machines_done.reject(err);
	}).done();


	// once everything is done
	Q.all([scores_done.promise, machines_done.promise])
	.then(function(){
		client.set('started', '0');
		client.flushdb();
		all_done.resolve(night_id);
	})
	.fail(function(err){
		all_done.reject(err);
	}).done();

	return all_done.promise;
};

exports.update = function(data){
	var d = Q.defer(),
		score_d = Q.defer(),
		machine_d = Q.defer(),
		multi = client.multi();

	for(var name_key in data.players){
		var obj = {
			abbv: data.abbv,
			points: data.players[name_key],
			played_order: data.played_order,
			name_key: name_key
		};
		multi.hmset('player:'+name_key+':scores:'+data.played_order, obj);
		client.zadd('player:'+name_key+':scores:order', data.played_order, 'player:'+name_key+':scores:'+data.played_order);
	}

	multi.exec(function(err, results){
		if(err){ score_d.reject(err); return false;}
		score_d.resolve(data);
	});

	var mac = {
		abbv: data.abbv,
		picked_by: data.picked_by,
		division_id: data.division_id,
		grouping: data.group
	};
	client.hmset('machineorder:'+data.division_id+':'+data.group+':'+data.played_order, mac, function(err, results){
		if(err){ machine_d.reject(err); return false;}
		machine_d.resolve();
	});
	client.zadd('machineorder:'+data.division_id+':'+data.group+':order', data.played_order, 'machineorder:'+data.division_id+':'+data.group+':'+data.played_order);
	client.rpush('machineorder:order', 'machineorder:'+data.division_id+':'+data.group+':'+data.played_order);

	Q.all([score_d, machine_d])
	.spread(function(score, machine){
		d.resolve(data);
	})
	.fail(function(err){
		d.reject(err);
	})
	.done();

	return d.promise;
};


// resolves the supplied defered object with our data
exports.resolveWithData = function(d){
	var started = exports.started(),
		starts = exports.starts(),
		night_id = exports.night_id(),
		divisions = exports.getDivisions();

	Q.all([ started, starts, night_id, divisions ])
	.spread(function(started, starts, night_id, divisions){
		var players = [];

		for(var i = 0; i < divisions.length; i++){
			var div = divisions[i];
			div.player_list.players.forEach(function(p){
				p.division_id = div.division_id;
				players.push(p);
			});
		}

		d.resolve({
			'started': started,
			'starts': starts,
			'night_id': night_id,
			'divisions': divisions,
			'players': players
		});
	}).fail(function(err){
		d.reject(err);
	}).done();

	return d.promise;
};

exports.getGroupForUser = function(name_key){
	var all_done = Q.defer(),
		promises = [],
		group = {
			order: null,
			players: [],
			machines: []
		};


	Q.ninvoke(client, 'hgetall', 'player:'+name_key)
	.then(function(player){

		var promises = [];

		// group order
		promises.push(Q.ninvoke(client, 'zrank', 'division:'+player.division_id+':groups', player.grouping));

		// players (really only need name_key, dnp, and scores)
		var players_d = Q.defer();
		client.zrange('group:'+player.grouping, 0, -1, function(err, name_keys){
			if(err){ console.log(err); players_d.reject(err); return false; }

			var score_done = Q.defer(),
				score_promises = [],
				dnp_done = Q.defer(),
				dnp_promises = [],
				players = [];

			function getPlayerScores(player){
				return Q.promise(function(resolve, reject, notify){
					client.zrange('player:'+player.name_key+':scores:order', 0, -1, function(err, score_keys){
						if(err){ reject(err); return false; }

						getPlayerMachines(player, score_keys)
						.then(function(){
							resolve(true);
						})
						.fail(function(err){
							reject(err);
						})
						.done();
					});
				});
			};

			name_keys.forEach(function(name_key){
				var player = {
					'name_key': name_key,
					'machines': []
				};
				players.push(player);
				dnp_promises.push( Q.ninvoke(client, 'hget', 'player:'+name_key, 'dnp') );

				// get the score keys
				// then call get player machines with player obj and score keys array
				// then resolve score_done
				score_promises.push(getPlayerScores(player));
			});


			Q.all(dnp_promises)
				.spread(function(){
					for(var i in arguments){
						players[i].dnp = arguments[i];
					}
					dnp_done.resolve(players);
				})
				.fail(function(err){
					dnp_done.reject(err);
				}).done();

			
			Q.all(score_promises)
			.then(function(){
				score_done.resolve();
			})
			.fail(function(err){
				score_done.reject(err);
			}).done();


			Q.all([score_done.promise, dnp_done.promise])
			.then(function(){
				players_d.resolve(players);
			})
			.fail(function(err){
				players_d.reject(err);
			}).done();
		});
		promises.push( players_d.promise );

		// machines
		var machines_d = Q.defer(),
			multi = client.multi();

		client.zrange('machineorder:'+player.division_id+':'+player.grouping+':order', 0, -1, function(err, keys){
			if(err){ console.log(err); machines_d.reject(err); return false; }

			keys.forEach(function(key){
				multi.hgetall(key);
			});

			multi.exec(function(err, machines){
				if(err){ console.log(err); machines_d.reject(err); return false; }
				machines_d.resolve(machines);
			});
		});
		promises.push( machines_d.promise );


		Q.all(promises)
		.spread(function(order_in_division, players, machines){
			group.order = order_in_division;
			group.players = players;
			group.division_id = parseInt(player.division_id, 10);
			group.machines = machines;

			all_done.resolve(group);
		})
		.fail(function(err){
			all_done.reject(err);
		}).done();

	});


	return all_done.promise;
};

exports.tiebreaker = function(data){
	var d = Q.defer(),
		night_id = data.night_id,
		starts = (data.starts == '' ? null : data.starts),
		values = [],
		resolve_with = {
			night_id: night_id,
			starts: starts,
			name_key: data.name_key,
			players: []
		};

	getPool().getConnection(function(err, db){
		if(err){ db.release(); d.reject(err); return false; }

		// WHAT HAPPENS IF STARTS IS NULL???
		// I DONT THINK IT CAN BE NULL

		var sql = "INSERT INTO tie_breaker (night_id, name_key, place) VALUES ? ON DUPLICATE KEY UPDATE place=VALUES(place)",
			sets = [];

		data.players.forEach(function(p){
			sets.push([night_id, p.name_key, p.place]);
		});

		db.query(sql, [sets], function(err, result){
			if(err){ db.release(); d.reject(err); return false; }

			// ties have been inserted into the tie_breaker table
			// but we still need to update the explicit league night order
			// map our places to their name_keys
			var places = [];
			data.players.forEach(function(p){
				places[ p.place - 1] = p.name_key;
			});

			// get the portion of the league night order we're dealing with
			db.query("SELECT order_id, name_key, grouping, start_order FROM league_night_order WHERE night_id = ? AND name_key IN (?) ORDER BY start_order", [night_id, places], function(err, results){
				if(err){ db.release(); d.reject(err); return false; }

				var update_data = [];
				results.forEach(function(r, i){
					update_data.push([ r.order_id, places[i] ]);
					resolve_with.players[i] = r;
					resolve_with.players[i].name_key = places[i];
					resolve_with.players[i].place = i + 1;
				});

				db.query("INSERT INTO league_night_order (order_id, name_key) VALUES ? ON DUPLICATE KEY UPDATE name_key=VALUES(name_key)", [update_data], function(err, result){
					if(err){ db.release(); d.reject(err); return false; }

					d.resolve(resolve_with);
					db.release();					
				});
			});
		});
	});
	
	return d.promise;
};

/*
 *	Get's the mysql pool connection
*/
function getPool(){
	return module.parent.exports.pool;
}