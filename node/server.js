/*
// Unfortunately cluster bombed horribly on the VPS, so disabled
// at least for now
var cluster = require('cluster'),
	numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
	var worker, i;

	// Fork workers.
	for (i = 0; i < numCPUs; i++) {
		worker = cluster.fork();
		console.info('Workerer #' + worker.id, 'with pid', worker.process.pid, 'is on');
	}

	cluster.on('exit', function(worker, code, signal) {
		console.info('Workerer #' + worker.id, 'with pid', worker.process.pid, 'died');
	});

} else {
*/
	var grpl = require('grpl'),
		io = require('socket.io').listen(834,{
			'close timeout': 3600, // 60 minutes to re-open a closed connection
			'browser client minification': true,
			'browser client etag': true,
			'browser client gzip': true
		}),
		https = require('https'),
		Q = require('q'),
		season_id = 3;


	var RedisStore = require('socket.io/lib/stores/redis'),
		redis  = require('socket.io/node_modules/redis'),
		pub    = redis.createClient(),
		sub    = redis.createClient(),
		client = redis.createClient();

	io.set('store', new RedisStore({
		redisPub : pub,
		redisSub : sub,
		RedisClient : client
	}));
	if(process.argv[2] != 'DEV')
		io.set('log level',2);

	io.configure(function (){
		io.set('authorization', function (handshakeData, callback) {
			var cookies = {};
			if(handshakeData.headers.cookie != undefined){
				handshakeData.headers.cookie && handshakeData.headers.cookie.split(';').forEach(function( cookie ) {
					var parts = cookie.split('=');
					cookies[ parts.shift().trim() ] = ( parts.join('=') || '' ).trim();
				});
			}
			if(cookies.user_hash != undefined){
				handshakeData.user_hash = cookies.user_hash;
			} else {
				// else step them up with an anonymous hash
				// this way we can keep track of season data
				handshakeData.user_hash = 'ANON'+(+new Date()).toString(36);
			}

			callback(null, true); // error first callback style 
		});
	});


	io.sockets.on('connection', function(socket){

		// console.log('connected to '+ cluster.worker.id);
		if(socket.handshake.user_hash != undefined){
			client.getset('uh'+socket.handshake.user_hash, socket.id, function(err, prev_socket_id){
				if(prev_socket_id != undefined){
					// copy the data from the previous id into the new one
					// don't delete because then we'll have issues with multi devices
					client.hgetall(prev_socket_id, function(err, data){
						if(data != null)
							client.hmset(socket.id, data);
					});
				} else {
					// else tell the front-end to save the anonymous cookie
					// do this here because it's the first we'll have the connection
					// but make sure to differiate between someone who has a legit user_hash but doesn't have a previous socket
					// and the actual anonymous hash otherwise we'll be logging people out with a fake cookie
					if(socket.handshake.user_hash.substr(0, 4) == 'ANON'){
						socket.emit('write_cookie', 'user_hash', socket.handshake.user_hash);
					}
				}
			});
		}

		/*
		 *	LOGIN METHODS
		*/
		// cookie hash
		socket.on('user.loginFromHash', function(hash, cb){
			grpl.player.getByHash(hash)
			.then(function(player){
				socket.set('user.name_key', player.name_key);
				socket.set('user.admin', player.admin);
				client.set('uh'+player.hash, socket.id);

				// remove our anon hash and update the handshake data
				if(socket.handshake.user_hash.substr(0, 4) == 'ANON'){
					client.del('uh'+socket.handshake.user_hash);
					socket.handshake.user_hash = player.hash;
				}

				cb(null, player);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		// facebook access token
		socket.on('user.loginFromAccessToken', function(token, cb){
			grpl.player.getByFBToken(token)
			.then(function(player){
				socket.set('user.name_key', player.name_key);
				socket.set('user.admin', player.admin);
				client.set('uh'+player.hash, socket.id);

				// remove our anon hash and update the handshake data
				if(socket.handshake.user_hash.substr(0, 4) == 'ANON'){
					client.del('uh'+socket.handshake.user_hash);
					socket.handshake.user_hash = player.hash;
				}

				cb(null, player);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		// email/password login
		socket.on('user.loginFromForm', function(email, password, cb){
			grpl.player.getByEmailAndPassword(email, password)
			.then(function(player){
				socket.set('user.name_key', player.name_key);
				socket.set('user.admin', player.admin);
				client.set('uh'+player.hash, socket.id);

				// remove our anon hash and update the handshake data
				if(socket.handshake.user_hash.substr(0, 4) == 'ANON'){
					client.del('uh'+socket.handshake.user_hash);
					socket.handshake.user_hash = player.hash;
				}

				cb(null, player);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		// registering a user to login with email/password
		socket.on('user.register', function(data, cb){
			grpl.player.register(data)
			.then(function(bool){
				cb(null, bool);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		/*
		 *	TIEBREAKER
		*/
		socket.on('tiebreaker', function(data, cb){
			grpl.scoring.tiebreaker(data)
			.then(function(name_key){
				cb(null, name_key);
				io.sockets.emit('tiesbroken', data.starts, name_key);
			})
			.fail(function(err){
				cb(err);
			});
		});


		/*
		 *	SCORING
		*/
		socket.on('scoring.emitIfStarted', function(){
			var d = Q.defer();

			grpl.scoring.resolveWithData(d)
			.then(function(data){
				if(data.started == true){
					socket.emit('scoring_started', data);
				}
			})
			.fail(function(err){
				console.log(err);
				socket.emit('error', err);
			}).done();
		});

		socket.on('scoring.started', function(cb){
			grpl.scoring.started()
			.then(function(started){
				cb(null, started);
			})
			.fail(function(err){
				console.log(err);
				cb(err);
			}).done();
		});

		socket.on('scoring.start', function(starts, cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can start scoring. If you think you should be an admin talk to the people in charge.</p>'
					});
				} else {
					if(!starts){
						socket.emit('error', 'You must supply a date for the scoring system');
						return false;
					}
					grpl.scoring.start(season_id, starts)
					.then(function(data){
						io.sockets.emit('scoring_started', data);
					})
					.fail(function(err){
						console.log(err);
						socket.emit('error', err);
					})
					.done();
				}
			});
		});

		socket.on('scoring.stop', function(cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can stop scoring. If you think you should be an admin talk to the people in charge.</p>',
						btn: false
					});
				} else {				
					grpl.scoring.stop();
					io.sockets.emit('scoring_stopped');
				}
			});
		});

		socket.on('scoring.getMachines', function(cb){
			grpl.scoring.getMachines()
			.then(function(d){
				cb(null, d);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		socket.on('scoring.getPlayers', function(cb){
			grpl.scoring.getPlayers()
			.then(function(d){
				cb(null, d);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		socket.on('scoring.getGroupForUser', function(name_key, cb){
			grpl.scoring.getGroupForUser(name_key)
			.then(function(d){
				cb(null, d);
			})
			.fail(function(err){
				console.log(err);
				cb(err);
			}).done();
		});

		socket.on('scoring.login', function(cb){
			socket.get('user.name_key', function(err, name_key){
				if(err){
					socket.emit('error', err.message);
				} else {
					cb(name_key);
					socket.emit('scoring_logged_in', name_key);
				}
			});
		});

		socket.on('scoring.update', function(data, cb){
			grpl.scoring.update(data)
			.then(function(data){
				socket.broadcast.emit('scoring_update', data);
				if(cb)
					cb(data);
			}).fail(function(err){
				socket.emit('error', err.msg);
			});	
		});


		/*
		 *	DATA API
		*/
		socket.on('changeSeason', function(season_id, cb){
			socket.set('season_id', season_id);
			cb(season_id);
		});
		socket.on('getSeason', function(cb){
			socket.get('season_id', function(err, season_id){
				if(err)
					cb(err);
				else
					cb(null, season_id);
			});
		});

		socket.on('season.getAll', function(cb){
			grpl.season.getAll()
			.then(function(seasons){
				cb(null, seasons);	
			}).fail(function(err){
				cb(err);
			}).done();
		})

		socket.on('leaguenight.update', function(data, cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can edit league nights. If you think you should be an admin talk to the people in charge.</p>'
					});
				} else {
					var start_str = data.starts.year + '-' +  ('0'+data.starts.month).slice(-2) + '-' +  ('0'+data.starts.day).slice(-2);
						d = new Date(data.starts.year, data.starts.month-1, data.starts.day),
						night = null;
					
					data.starts = start_str;
					night = new grpl.leaguenight.LeagueNight(data);
					night.save()
					.then(function(night){
						var defers = [];
						
						// only update the machines if it's a night in the future
						var today = new Date();
						today.setHours(0);
						today.setMinutes(0);
						today.setSeconds(0);
						today.setMilliseconds(0);
						if(today <= d){
							var mtln = new grpl.machinetoleaguenight.MachineToLeagueNight(night.starts);
							for(var display_order in data.machines){
								var abbv = data.machines[display_order];
								if(abbv != ''){
									mtln.add(abbv, display_order);
								}
							}
							defers.push( mtln.save() );
						}

						// update the subs
						var sublist = new grpl.playersublist.PlayerSubList(night.starts);
						for(var i in data.subs){
							sublist.add(data.subs[i]);
						}
						defers.push( sublist.save() );

						Q.all(defers)
						.then(function(){
							cb(null, night);
							// send the event to everyone, including the person who sent it
							io.sockets.emit('leaguenight_updated', night);

						}).fail(function(err){
							cb(err);
						}).done();

					}).fail(function(err){
						cb(err);
					}).done();
				}
			});			
		});

		// gets all of the league nights for the season, including a totals
		socket.on('leaguenight', function(cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.leaguenight.getAllForSeason(socket_season_id)
				.then(function(nights){
					var totals = new grpl.leaguenight.LeagueNight({
						'season_id': socket_season_id,
						starts: 'totals',
						night_id: 'totals',
						title: 'Totals to Date',				
						note: ''
					});
					nights.unshift(totals);
					cb(null, nights);
				})
				.fail(function(err){
					cb(err);
				}).done();
			});
			
		});

		// people who are ties
		socket.on('leaguenight.ties', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.getTies(socket_season_id, starts)
				.then(function(ties){
					cb(null, ties);
				}).fail(function(err){
					console.log(err);
					cb(err);
				}).done();
			});
			
		});

		// get the information for totals
		socket.on('leaguenight.totals', function(cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				Q.all([
					grpl.playerlist.getRankings(socket_season_id)
				])
				.spread(function(player_list){//, machine_list){
					var night = new grpl.leaguenight.LeagueNight({
						starts: 'totals',
						night_id: 'totals',
						title: 'Totals to Date',				
						note: '',
						players: player_list.players,
						machines: [], // machine_list,
						machines_note: 'no machines for totals' //'Machines Played Less Than Twice'
					});
					cb(null, night);
				})
				.fail(function(err){
					cb(err);
				}).done();
			});
			
		});

		// get all the players and the current rankings
		socket.on('leaguenight.totals.players', function(cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.getRankings(socket_season_id)
				.then(function(player_list){
					cb(null, player_list.players);
				}).fail(function(err){ cb(err); }).done();
			});
			
		});

		socket.on('leaguenight.totals.machines', function(cb){
			cb(null, []);
		});

		// information for a specific league night
		socket.on('leaguenight.starts', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.leaguenight.getByStarts(starts)
				.then(function(night){
					var promises = [];
					
					// get player points
					if(new Date(night.starts).getTime() <= new Date().getTime()){
						promises.push( grpl.playerlist.getPointsForNight(socket_season_id, starts) );
					} else {
						promises.push( grpl.playerlist.getRankings(socket_season_id, starts) );
					}

					// get machines
					promises.push( grpl.machine.getForLeagueNight(starts) );

					// wait for both machines and players to be done
					Q.all(promises)
					.spread(function( player_list, machine_list){
						night.players = player_list.players;
						night.machines = machine_list;
						cb(null, night);

					}).fail(function(err){ 
						console.log(err);
						cb(err); 
					}).done();

				}).fail(function(err){ cb(err); }).done();
			});
				
		});

		// get players and rankings for a specific night
		socket.on('leaguenight.starts.players', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				var promise;
				if(new Date(night.starts).getTime() <= new Date().getTime()){
					promise =  grpl.playerlist.getPointsForNight(socket_season_id, starts);
				} else {
					promise = grpl.playerlist.getRankings(socket_season_id, starts);
				}

				promise
				.then(function(player_list){
					cb(null, player_list.players);
				}).fail(function(err){ cb(err); }).done();
			});
				
		});

		socket.on('leaguenight.starts.machines', function(starts, cb){
			grpl.machine.getForLeagueNight(starts)
			.then(function(machines){
				cb(null, machines);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('machine', function(season_id, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.machine.getForSeason(socket_season_id)
				.then(function(machines){
					cb(null, machines);
				}).fail(function(err){ cb(err); }).done();
			});
				
		});

		socket.on('machine.abbv', function(abbv, cb){
			grpl.machine.getByAbbv(abbv)
			.then(function(machine){
				cb(null, machine);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('players', function(season_id, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.getForSeason(socket_season_id)
				.then(function(playerlist){
					cb(null, playerlist.players);
				}).fail(function(err){ cb(err); }).done();
			});
				
		});

		socket.on('players.namekey', function(name_key, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				var data = {};

				grpl.playerlist.getRankings(socket_season_id)
				.then(function(list){
					var player = list.getPlayer(name_key),
						promises = [];

					data.player = player;
					data.place = player.place;
					data.total_points = player.score;

					Q.all([ player.getNightTotals(socket_season_id), player.getMachinePoints(socket_season_id), player.getNightPlace(socket_season_id) ])
					.spread(function(nights, machines, places){
						data.nights = nights;
						data.machines = machines;
						data.places = places;

						cb(null, data);

					}).fail(function(err){ console.log(err); cb(err); }).done();
				}).fail(function(err){ console.log(err); cb(err); }).done();
			});
				
		});

		socket.on('changelog', function(cb){
			grpl.changelog.get()
			.then(function(data){
				cb(null, data);
			}).fail(function(err){ cb(err); }).done();
		});

		
		/*
		 *	Random Utility Functions
		*/
		socket.on('echo', function(str){
			console.log(str);
		});

	});// end connect


// }