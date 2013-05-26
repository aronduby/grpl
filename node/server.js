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


io.sockets.on('connection', function(socket){

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
					grpl.machine.getMachinesPlayedLessThanXTimes(season_id, 2, 50)
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

			}).fail(function(err){ cb(err); }).done();

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

});


