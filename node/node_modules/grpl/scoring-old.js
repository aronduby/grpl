var Q = require('q'),
	redis = require('redis'),
	client = redis.createClient();

// socket.io redis store keeps everything in database 0
// switch this over to database 1 so that we can flush as needed
// without screwing with socket or messing up data entry
client.select(1);

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
}

exports.starts = function(){
	var d = Q.defer();
	client.get('starts', function(err, data){
		if(err){ d.reject(err); return false; }
		d.resolve(data);
	});
	return d.promise;
}

exports.night_id = function(){
	var d = Q.defer();
	client.get('night_id', function(err, data){
		if(err){ d.reject(err); return false; }
		d.resolve(data);
	});
	return d.promise;
}

exports.getMachines = function(){
	var d = Q.defer(),
		d2 = Q.defer(),
		multi = client.multi();

	client.lrange('machineorder', 0, -1, function(err, machines){
		if(err){ d.reject(err); return false; }
		machines.forEach(function(abbv){
			multi.hgetall('machine:'+abbv);
		});
		d2.resolve();
	});

	d2.promise.then(function(){
		multi.exec(function(err, results){
			if(err){ d.reject(err); return false;}

			d.resolve(results);
		});
	});

	return d.promise;
}

exports.getPlayers = function(){
	var d = Q.defer(),
		players = [];

	var multi = client.multi();
	client.zrevrange('playerorder', 0, -1, function(err, name_keys){
		if(err){ throw new Error(err) }
		
		name_keys.forEach(function(name_key){
			multi.hgetall('player:'+name_key);
			multi.hgetall('player:'+name_key+':scores');
		});

		multi.exec(function(err, results){
			if(err){ d.reject(err); return false;}

			// results of the calls will come back stacked
			// 0 => player 	1 => player[0] scores
			// 2 => player 	3 => player[2] scores
			// etc.
			var i = 0;
			while(i < results.length){				
				var player = results[i];
				i++;
				player.machines = results[i];

				var night_score = 0;
				for(var abbv in player.machines){
					night_score += Number(player.machines[abbv]);
				}
				player.night_score = night_score;


				players.push(player);
				i++;
			}

			d.resolve(players);
		});
	});

	return d.promise;
}

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
			m.active = parseInt(m.active, 10);
			m.machine_id = parseInt(m.machine_id, 10);
			m.note = m.note == 'null' ? null : m.note;
			m.url = m.url == 'null' ? null : m.url;

			divisions[m.division_id].machines.push(m);
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
	}).done()


	return all_done.promise;
}


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

							division.machines.forEach(function(machine){
								machine.division_id = division.division_id;
								client.rpush('machineorder', machine.abbv);
								client.rpush('machineorder:'+division.division_id, machine.abbv);
								client.hmset('machine:'+machine.abbv, machine);
							});

							division.player_list.players.forEach(function(player){
								player.division_id = division.division_id;
								resolveWith.players.push( player );

								client.zadd('playerorder', player.start_order, player.name_key);
								client.zadd('group:'+player.grouping, player.start_order, player.name_key);
								client.zadd('division:'+player.division_id+':groups', player.grouping, player.grouping);
								client.hmset('player:'+player.name_key, player);
								client.hmset('player:'+player.name_key+':scores', player.machines);
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
}

exports.stop = function(){
	var d = Q.defer();

	client.set('started', '0');

	client.get('night_id', function(err, night_id){
		if(err){ d.reject(err); return false; }

		// get the values from redis and insert into mysql
		// name keys are stored in the order set
		client.zrange('playerorder', 0, -1, function(err, rsp){
			if(err){ d.reject(err); return false; }

			// now loop through the order and get that hash
			rsp.forEach(function(name_key){
				client.hgetall('player:'+name_key+':scores', function(err, hash){
					if(err){ d.reject(err); return false; }

					var sql = "REPLACE INTO league_night_score (night_id, name_key, abbv, points) VALUES (?, ?, ?, ?)";
					getPool().getConnection(function(err, db){
						if(err){ d.reject(err); return false; }

						for(var abbv in hash){
							var score = hash[abbv];

							if(!score)
								continue;

							var query = db.query(sql, [night_id, name_key, abbv, score]);
							console.log(query.sql);
						}

						db.release();
					});

				});
			});

			client.flushdb();
			d.resolve(true);
		});

	});

	return d.promise;
}

exports.update = function(data){
	var d = Q.defer(),
		multi = client.multi();

	for(var name_key in data.players){
		multi.hmset('player:'+name_key+':scores', data.abbv, data.players[name_key]);
	}

	multi.exec(function(err, results){
		if(err){ d.reject(err); return false;}
		d.resolve(data);
	});

	return d.promise;
}



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
}

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

			name_keys.forEach(function(name_key){
				players.push({'name_key': name_key, machines: null });
				score_promises.push( Q.ninvoke(client, 'hgetall', 'player:'+name_key+':scores') );
				dnp_promises.push( Q.ninvoke(client, 'hget', 'player:'+name_key, 'dnp') );
			});

			Q.all(score_promises)
			.spread(function(){
				for(var i in arguments){
					for(var j in arguments[i]){
						arguments[i][j] = parseInt(arguments[i][j], 10);
					}
					players[i].machines = arguments[i];
				}
				score_done.resolve(players);
			})
			.fail(function(err){
				score_done.reject(err);
			}).done();

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

		client.lrange('machineorder:'+player.division_id, 0, -1, function(err, abbvs){
			if(err){ console.log(err); machines_d.reject(err); return false; }

			abbvs.forEach(function(abbv){
				multi.hgetall('machine:'+abbv)
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

			// make the machines the proper order for this group
			// with 5 groups, every group after that loops back in order
			// so group 6 plays the same order as 1
			// group 7 plays the same order as 2
			// ...
			// but keep in mind the indexed are 0 based so group 1 = 0
			var offset = order_in_division % machines.length;
			group.machines = machines.slice(offset).concat(machines.slice(0,offset));

			all_done.resolve(group);
		})
		.fail(function(err){
			all_done.reject(err);
		}).done();

	});


	return all_done.promise;
}

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

		/*
		var sql = "INSERT INTO tie_breaker (night_id, name_key, place) VALUES (?, ?, ?) ON DUPLICATE KEY update place=VALUES(place)";
		data.players.forEach(function(p){
			var query = db.query(sql, [night_id, p.name_key, p.place]);
			// console.log(query.sql);
		});
		d.resolve(data.players[0].name_key);

		db.release();
		*/
	});
	
	return d.promise;
}


/*
 *	Get's the mysql pool connection
*/
function getPool(){
	return module.parent.exports.pool;
}