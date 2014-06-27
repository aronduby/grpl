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
		season_id;

	var logger = require('tracer').colorConsole();

	// grab the current season_id
	grpl.season.getCurrent()
	.then(function(season){
		season_id = season.season_id
	})
	.fail(function(err){
		season_id=4;
	}).done();


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
				io.sockets.emit('tiesbroken', data.night_id, name_key);
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
				logger.error(err.stack);
				socket.emit('error', err);
			}).done();
		});

		socket.on('scoring.started', function(cb){
			grpl.scoring.started()
			.then(function(started){
				cb(null, started);
			})
			.fail(function(err){
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

		socket.on('scoring.getDivisions', function(cb){
			grpl.scoring.getDivisions()
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
				logger.error(err.stack);
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
			socket.get('season_id', function(err, s_season_id){
				if(err)
					cb(err);
				else {
					if(s_season_id == null)
						s_season_id = season_id;

					cb(null, {
						'active': s_season_id, 
						'current': season_id
					});
				}
			});
		});

		socket.on('season.getAll', function(cb){
			grpl.season.getAll()
			.then(function(seasons){
				cb(null, seasons);	
			}).fail(function(err){
				cb(err);
			}).done();
		});

		socket.on('season.update', function(data, cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can edit season. If you think you should be an admin talk to the people in charge.</p>'
					});
				} else {
					var season = new grpl.season.Season(data.season_id, data.title);
					season.current = data.current == true;
					season.save()
					.then(function(){
						if(season.current == true)
							season_id = season.season_id;

						// save the divisions and then do the division checks
						var promises = [];
						data.divisions.forEach(function(dd){
							var d = new grpl.division.Division(dd);
							if(d.season_id == null)
								d.season_id = season.season_id;

							promises.push( d.save() );
						});

						Q.all(promises)
						.then(function(){
							grpl.division.checkCapsForSeason(season.season_id)
							.then(function(r){
								cb(null, r);
								io.sockets.emit('season_updated', season);		
							})
							.fail(function(err){
								logger.error(err.stack);
								cb(err);
							}).done();

						})
						.fail(function(err){
							logger.error(err.stack);
							cb(err);
						}).done();
						
						
					}).catch(function(err){
						logger.error(err.stack);
						cb(err);
					}).done();					
				}
			});
		})

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

		// people who are tied
		socket.on('leaguenight.ties', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.getTies(socket_season_id, starts)
				.then(function(ties){
					cb(null, ties);
				}).fail(function(err){
					logger.error(err.stack);
					cb(err);
				}).done();
			});
			
		});

		// get the information for totals
		socket.on('leaguenight.totals', function(cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.division.getForSeason(socket_season_id)
				.then(function(divisions){
					var night = new grpl.leaguenight.LeagueNight({
						starts: 'totals',
						night_id: 'totals',
						title: 'Totals to Date',				
						note: '',
						divisions: divisions
					});
					cb(null, night);
				})
				.fail(function(err){
					logger.error(err.stack);
					cb(err);
				}).done();
			});
			
		});

		// information for a specific league night
		socket.on('leaguenight.starts', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.leaguenight.getByStarts(starts)
				.then(function(night){
					var future_night = (new Date(night.starts).getTime() >= new Date().getTime());
					
					grpl.division.getPointsForNight(socket_season_id, starts, future_night)
					.then(function( divisions ){
						night.divisions = divisions;
						cb(null, night);

					}).fail(function(err){ 
						logger.error(err);
						cb(err); 
					}).done();

				}).fail(function(err){ cb(err); }).done();
			});				
		});

		socket.on('leaguenight.order', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.getOrderForNight(socket_season_id, starts)
				.then(function(order){
					
					cb(null, order);					

				}).fail(function(err){ cb(err); }).done();
			});
		});




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
							for(var i in data.divisions){
								var div = data.divisions[i],
									mtln = new grpl.machinetoleaguenight.MachineToLeagueNight(night.night_id, div.division_id);

								for(var display_order in div.machines){
									var abbv = div.machines[display_order];
									if(abbv != ''){
										mtln.add(abbv, display_order);
									}
								}
								defers.push( mtln.save() );
							}
						}

						// update the subs
						var sublist = new grpl.playersublist.PlayerSubList(night.night_id);
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

		socket.on('leaguenight.update.order', function(data, cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can edit league nights. If you think you should be an admin talk to the people in charge.</p>'
					});
				} else {
					var today = new Date();
						today.setHours(0);
						today.setMinutes(0);
						today.setSeconds(0);
						today.setMilliseconds(0);

					var nd = new Date(data.starts + ' 0:0:0');
						//nd.setHours(0);
						//nd.setMinutes(0);
						//nd.setSeconds(0);
						//nd.setMilliseconds(0);

					if(nd < today){
						socket.emit('error', {
							title:'Error',
							headline: 'Nope...',
							msg: '<p>You can\'t edit the start order of a night that already happened</p>'
						});
					} else {
						grpl.leaguenight.getByStarts(data.starts)
						.then(function(night){
							
							data.night_id = night.night_id;
							
							night.saveOrder(data)
							.then(function(order){
								cb(null, true);
								io.sockets.emit('leaguenight_updated', night);
							})
							.fail(function(err){
								cb(err);
							}).done();
							
						})
						.fail(function(err){
							cb(err);
						}).done();
					}
				}
			});
		});





		socket.on('playerlist.createStartOrderForNight', function(starts, cb){
			socket.get('season_id', function(err, socket_season_id){
				if(err || socket_season_id == null)
					socket_season_id = season_id;

				grpl.playerlist.createStartOrderForNight(socket_season_id, starts)
				.then(function(order){

					grpl.leaguenight.getByStarts(starts)
					.then(function(night){
						var data = {
							order: order,
							season_id: night.season_id,
							night_id: night.night_id
						};
						night.saveOrder(data)
						.then(function(){
							cb(null, true);
						})
						.fail(function(err){
							cb(err);
						}).done();
					})
					.fail(function(err){
						logger.error(err.stack);
						cb(err);
					}).done();
					
				}).fail(function(err){ cb(err); }).done();
			});
		});


		socket.on('division.getForSeason', function(season_id, cb){
			grpl.division.getForSeason(season_id, true)
			.then(function(divisions){
				cb(null, divisions);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('division.getForSeasonNoPlayers', function(season_id, cb){
			grpl.division.getForSeasonNoPlayers(season_id)
			.then(function(divisions){
				cb(null, divisions);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('division.checkCapsForSeason', function(season_id, cb){
			grpl.division.checkCapsForSeason(season_id)
			.then(function(data){
				cb(null, data);
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

		socket.on('machine.all', function(cb){
			grpl.machine.getAll()
			.then(function(machines){
				cb(null, machines);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('machine.active', function(cb){
			grpl.machine.getActive()
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

		socket.on('machine.update', function(data, cb){
			socket.get('user.admin', function(err, admin){
				if(admin != true && admin != 'true'){
					socket.emit('error', {
						title:'Error',
						headline: 'Nope...',
						msg: '<p>Only Admins can edit machines. If you think you should be an admin talk to the people in charge.</p>'
					});
				} else {
					var http = require('http'),
						fs = require('fs'),
						d = Q.defer();

					var download = function(url, dest, success, error) {
						var file = fs.createWriteStream(dest);

						var request = http.get(url, function(response) {
							response.pipe(file);
							file.on('finish', function() {
								file.close(success);
							});
						}).on('error', function(err) { // Handle errors
							fs.unlink(dest); // Delete the file async. (But we don't check the result)
							error(err);
						});
					};

					if(data.new_url.length){
						var u = 'layout_imgs/machines/'+data.abbv+'.jpg';
						download(
							data.new_url, 
							'../site/'+u, 
							function(){ 
								d.resolve(u); 
							}, 
							function(err){ 
								d.reject(err); 
							}
						);
					} else {
						d.resolve(data.image);
					}

					d.promise.then(function(image){
						data.image = image;
						var m = new grpl.machine.Machine(data);

						m.save().then(function(m){
							cb(null, m);
						}).fail(function(err){ 
							cb(err); 
						}).done();

					}).fail(function(err){ 
						cb(err); 
					}).done();


				}
			});
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

		socket.on('players.all', function(cb){
			grpl.playerlist.getAll()
			.then(function(playerlist){
				cb(null, playerlist.players);
			}).fail(function(err){ cb(err); }).done();
		});

		socket.on('players.all.namekey', function(name_key, cb){
			grpl.player.getByNameKey(name_key)
			.then(function(player){
				cb(null, player);
			}).fail(function(err){ cb(err); }).done();
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

					}).fail(function(err){ 
						logger.error(err); 
						logger.trace(err.stack);
						cb(err); 
					}).done();
				
				}).fail(function(err){ 
					logger.error(err); 
					cb(err); 
				}).done();
			});
				
		});

		socket.on('players.getSeasons', function(name_key, cb){
			grpl.player.getSeasonsForNameKey(name_key)
			.then(function(season_ids){
				cb(null, season_ids);
			}).fail(function(err){ logger.error(err); cb(err); }).done();
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
			logger.log(str);
		});

	});// end connect




/*
 *	Add a server for seperate api call for randomizer
*/
var server = require('http').createServer(),
	url = require('url');

server.on('request', function (req, res) {
	var uri = url.parse(req.url, true),
		client_updated = uri.query.t == undefined ? new Date(0) : new Date(Number(uri.query.t));

	switch(uri.pathname){
		case '/randomizer/update':
			grpl.machine.getLastUpdated()
			.then(function(server_updated){
				if(client_updated > server_updated){
					res.writeHead(304);
					res.end();
				} else {
					grpl.machine.getActive()
					.then(function(machines){
						res.writeHead(200, {"Content-Type": "application/json"});
						res.write(JSON.stringify(machines));
						res.end();
					})
					.fail(function(err){
						res.writeHead(500, {"Content-Type": "application/json"});
						res.write(JSON.stringify(err));
						res.end();
					}).done();
				}
			})
			.fail(function(err){
				res.writeHead(500, {"Content-Type": "application/json"});
				res.write(JSON.stringify(err));
				res.end();
			}).done();
			break;
		default:
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
			res.end();
			break;
	}
});

server.listen(835);

// }