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
			'close timeout': 2700, // 45 minutes to re-open a closed connection
			'browser client minification': true,
			'browser client etag': true,
			'browser client gzip': true
		}),
		https = require('https'),
		Q = require('q'),
		season_id = 2;


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
	io.set('log level',2);


	io.sockets.on('connection', function(socket){

		// console.log('connected to '+ cluster.worker.id);

		/*
		 *	LOGIN METHODS
		*/
		// cookie hash
		socket.on('user.loginFromHash', function(hash, cb){
			grpl.player.getByHash(hash)
			.then(function(player){
				socket.set('user.name_key', player.name_key);
				socket.set('user.admin', player.admin);
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
			.then(function(){
				cb(null, true);
				io.sockets.emit('tiesbroken', data.starts);
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
					grpl.scoring.start(starts)
					.then(function(data){
						io.sockets.emit('scoring_started', data);
					})
					.fail(function(err){
						console.log(err);
						socket.emit('error', err.message);
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
		// gets all of the league nights for the season, including a totals
		socket.on('leaguenight', function(cb){
			grpl.leaguenight.getAllForSeason(season_id)
			.then(function(nights){
				var totals = new grpl.leaguenight.LeagueNight({
					'season_id': season_id,
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

		// people who are ties
		socket.on('leaguenight.ties', function(cb){
			grpl.playerlist.getTies()
			.then(function(ties){
				cb(null, ties);
			}).fail(function(err){
				console.log(err);
				cb(err);
			}).done();
		});

		// get the information for totals
		socket.on('leaguenight.totals', function(cb){
			Q.all([
				grpl.playerlist.getRankings(),
				grpl.machine.getPlayedLessThanXTimes(season_id, 2, 50)
			])
			.spread(function(player_list, machine_list){
				var night = new grpl.leaguenight.LeagueNight({
					starts: 'totals',
					night_id: 'totals',
					title: 'Totals to Date',				
					note: '',
					players: player_list.players,
					machines: machine_list,
					machines_note: 'Machines Played Less Than Twice'
				});
				cb(null, night);
			})
			.fail(function(err){
				cb(err);
			}).done();
		});

		// get all the players and the current rankings
		socket.on('leaguenight.totals.players', function(cb){
			grpl.playerlist.getRankings()
			.then(function(player_list){
				cb(null, player_list.players);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('leaguenight.totals.machines', function(cb){
			cb(null, []);
		});

		// information for a specific league night
		socket.on('leaguenight.starts', function(starts, cb){
			grpl.leaguenight.getByStarts(starts)
			.then(function(night){
				var promises = [];
				
				// get player points
				if(new Date(night.starts).getTime() <= new Date().getTime()){
					promises.push( grpl.playerlist.getPointsForNight(starts) );
				} else {
					promises.push( grpl.playerlist.getRankings(starts) );
				}

				// get machines
				promises.push( grpl.machine.getForLeagueNight(starts) );

				// wait for both machines and players to be done
				Q.all(promises)
				.spread(function( player_list, machine_list){
					night.players = player_list.players;
					
					if(machine_list.length == 0){			
						// if machines aren't set yet show all the machines played less than twice
						grpl.machine.getPlayedLessThanXTimes(season_id, 2, 50)
						.then(function(machine_list){
							night.machines = machine_list;
							night.machines_note = 'Machines Played Less Than Twice';
							cb(null, night);

						}).fail(function(err){
							cb(err);
						}).done();

					} else {
						night.machines = machine_list;
						cb(null, night);
					}

				}).fail(function(err){ 
					console.log(err);
					cb(err); 
				}).done();

			}).fail(function(err){ cb(err); }).done();
		});

		// get players and rankings for a specific night
		socket.on('leaguenight.starts.players', function(starts, cb){
			var promise;

			if(new Date(night.starts).getTime() <= new Date().getTime()){
				promise =  grpl.playerlist.getPointsForNight(starts);
			} else {
				promise = grpl.playerlist.getRankings(starts);
			}

			promise
			.then(function(player_list){
				cb(null, player_list.players);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('leaguenight.starts.machines', function(starts, cb){
			grpl.machine.getForLeagueNight(starts)
			.then(function(machines){
				cb(null, machines);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('machine', function(season_id, cb){
			grpl.machine.getForSeason(season_id)
			.then(function(machines){
				cb(null, machines);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('machine.abbv', function(abbv, cb){
			grpl.machine.getByAbbv(abbv)
			.then(function(machine){
				cb(null, machine);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('players', function(season_id, cb){
			grpl.playerlist.getForSeason(season_id)
			.then(function(playerlist){
				cb(null, playerlist.players);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('players.namekey', function(name_key, cb){
			var data = {};

			grpl.playerlist.getRankings()
			.then(function(list){
				var player = list.getPlayer(name_key),
					promises = [];

				data.player = player;
				data.place = player.place;
				data.total_points = player.score;

				Q.all([ player.getNightTotals(season_id), player.getMachinePoints(season_id) ])
				.spread(function(nights, machines){
					data.nights = nights;
					data.machines = machines;

					cb(null, data);

				}).fail(function(err){ console.log(err); cb(err); }).done();
			}).fail(function(err){ console.log(err); cb(err); }).done();
		});

		
		/*
		 *	Random Utility Functions
		*/
		socket.on('echo', function(str){
			console.log(str);
		});

	});// end connect


// }