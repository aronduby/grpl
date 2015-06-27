var grpl = require('grpl'),
	Q = require('q'),
	_ = require('underscore'),
	mysql = require('mysql'),
	db_pool = mysql.createPool({
		host     : 'localhost',
		port     : '3306', 
		user     : 'grpl',
		password : 'phyle7mothy',
		database : 'grpl'
	});

var season_id = 6,
	starts = '2015-04-15';


grpl.playerlist.getRankings(season_id)
.then(function(rankings){

	console.info('>> ranking based');

	var players = rankings.players;

	// create a ranking movement variable
	_.each(players, function(player){
		player.ranking_movement = player.previous_rank - player.rank;
	});

	// removes anyone who moved down
	var players_by_ranked_movement = _.chain(players)
		.filter(function(p){
			return p.ranking_movement >= 0;
		})
		.sortBy('ranking_movement')
		.reverse()
		.value();
	

	/*
	 *	Biggest climber
	 *
	 *	currently allows biggest climber in the other badges
	 *	switch to pop to not allow that
	 *		
	*/
	var climber_group = _.groupBy( _.filter(players_by_ranked_movement, 'ranking_movement'), 'ranking_movement'),
		movements = _.keys(climber_group).reverse(),
		biggest_climber = climber_group[movements[0]];
	console.log('biggest climber', biggest_climber);

	/*
	 *	Moved at Least X Ranks Or Stayed the Same
	 *
	*/
	var grouped = _.groupBy(players_by_ranked_movement, function(item){
		var val = item.ranking_movement;
		switch(true){
			case val >= 30:
				return '30';
			case val >= 20:
				return '20';
			case val >= 10:
				return '10';
			case val >= 5:
				return '5';
			case val == 0:
				return 'same';
			default:
				return '0';
		}
	});
	console.log('grouped movement', grouped);

});


grpl.playerlist.getPointsForNight(season_id, starts)
.then(function(scores){

	console.info('>> nights score based');

	var players = scores.players,
		players_by_score = _.sortBy(players, 'night_score').reverse(),
		grouped_by_score = _.groupBy(players_by_score, 'night_score'),
		scores = _.keys(grouped_by_score).reverse(),
		total_points = _.reduce(players, function(memo, player){ return memo + player.night_score; }, 0);

	// arrange the players in the score groups by rank with lower first
	// this gives a slight bend to people with lower ranks in the percentage break down
	_.each(grouped_by_score, function(group){
		_.sortBy(group, 'rank');
	});

	/*
	 *	Top Scorer(s)
	*/
	var top_scorers = grouped_by_score[scores[0]];
	console.log('top scorers', top_scorers);

	/*
	 *	Top X% of the Score for the Night
	*/
	var ten_per = Math.round(total_points * .1),
		ten_per_players = [],
		twenty_per = Math.round(total_points * .2),
		twenty_per_players = [],
		fifty_per = Math.round(total_points * .5),
		fifty_per_players = [],
		flattened = _.chain(grouped_by_score)
			.values()
			.reverse()
			.flatten()
			.value();

	console.log(total_points, ten_per, twenty_per, fifty_per);

	var sum = 0,
		i = 0;
	while(sum < fifty_per){
		var player = flattened[i];

		switch(true){
			case sum <= ten_per:
				ten_per_players.push(player);
				break;
			case sum <= twenty_per:
				twenty_per_players.push(player);
				break;
			case sum <= fifty_per:
				fifty_per_players.push(player);
				break;
		}

		// summing after favors putting people in the better group since they'd be contributing to that group
		sum += player.night_score;
		i++;
	}
	console.log( ten_per_players, twenty_per_players, fifty_per_players );

	/*
	 *	Best Score in the Group
	*/
	var groups = _.groupBy(players, 'grouping'),
		best_in_groups = [];

	_.each(groups, function(group){
		var top = _.max(group, function(player){
			return player.night_score;
		});
		best_in_groups.push(top);
	});
	console.log('best in groups', groups, best_in_groups);
	


	var all_firsts = [],
		three_firsts = [],
		more_up_than_down = [],
		no_lasts = [];

	_.each(players, function(player){
		var machines = player.machines;

		/*
		 *	All Firsts or >= 3 Firsts (not inclusive)
		*/
		var firsts = _.filter(machines, function(machine){ return machine.points == 7; }).length;
		if(firsts == machines.length){
			all_firsts.push(player);
		} else if(firsts >= 3){
			three_firsts.push(player);
		}

		/*
		 *	More Ups Than Downs
		 *	counts 2nd in a group of 3 (4 points) as an up
		*/
		var ups = [7,5,4];
		var ups_and_downs = _.partition(machines, function(machine){
			return _.contains(ups, machine.points);
		});
		if(ups_and_downs[0].length > ups_and_downs[1].length){
			more_up_than_down.push(player);
		}

		/*
		 *	No Lasts
		 *	treats DNPs as lasts
		*/
		var points = _.pluck(machines, 'points');
		if(_.contains(points, 1) === false && _.contains(points, 0) === false){
			no_lasts.push(player);
		}

	});
	console.log('all firsts', all_firsts);
	console.log('three firsts', three_firsts);
	console.log('more up than down', more_up_than_down);
	console.log('no lasts', no_lasts);

	averages(season_id, starts, players, total_points);

});

function averages(season_id, starts, players, total_points_for_night){
	console.log('>> averages');

	/*
	 *	Better Than LEAGUE NIGHT Average
	*/
	var night_average = total_points_for_night / players.length;
	var above_avg = _.filter(players, function(player){
		return player.night_score > night_average;
	});
	console.log('Above Night Average', night_average, above_avg);


	var count = Q.defer();
	db_pool.getConnection(function(err, db){
		if(err){ count.reject(err); db.release(); return false; }

		// first see how many nights have been played this season
		var sql = "SELECT COUNT(*) AS count FROM league_night WHERE season_id = ?";
		db.query(sql, [season_id], function(err, results){
			if(err){ count.reject(err); db.release(); return false; }
			count.resolve(results[0]['count']);
			db.release();
		});
	});

	count.promise
	.then(function(count){
		// wait untill there have been a few nights for player and league average
		if(count >= 3){

			/*
			 *	Better Than LEAGUE SEASON average
			*/
			var league_season_average = Q.defer();
			db_pool.getConnection(function(err, db){
				if(err){ league_season_average.reject(err); db.release(); return false; }

				var sql = "SELECT AVG(points) AS average FROM player_points_per_night WHERE season_id = ?";
				db.query(sql, [season_id], function(err, results){
					if(err){ league_season_average.reject(err); db.release(); return false; }

					var avg = results[0]['average'];
					var above_avg = _.filter(players, function(player){
						return player.night_score > avg;
					});
					console.log('Above League Season Average', avg, above_avg);

					league_season_average.resolve();
					db.release();
				});
			});

			/*
			 *	Better Than PLAYER SEASON average
			*/
			var player_season_average = Q.defer();
			db_pool.getConnection(function(err, db){
				if(err){ player_season_average.reject(err); db.release(); return false; }

				var sql = "SELECT name_key, AVG(points) AS average FROM player_points_per_night WHERE season_id = ? GROUP BY name_key;";
				db.query(sql, [season_id], function(err, results){
					if(err){ player_season_average.reject(err); db.release(); return false; }

					var player_avgs = {};
					_.each(results, function(r){
						player_avgs[r.name_key] = r.average;
					});

					var above_avg = _.filter(players, function(player){
						return player.night_score > player_avgs[player.name_key];
					});
					console.log('Above Player Season Average', player_avgs, above_avg);
					
					player_season_average.resolve();
					db.release();
				});
			});

		} else {
			console.log('skipping player and league season average');
		}
	})
	.fail(function(err){
		console.log(err);
	}).done();

}