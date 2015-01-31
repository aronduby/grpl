require(['js/app'], function(app){

	app.factory('adminMenu', ['bodyClassesApi', function(bodyClassesApi){
		return {
			open: function(){
				bodyClassesApi.add('amo');
			},
			close: function(){
				bodyClassesApi.remove('amo');
			},
			toggle: function(){
				bodyClassesApi.toggle('amo');
			}
		}
	}]);



	var injectParams = ['$scope', 'dialog', 'api', 'adminMenu', 'Auth', 'LeagueNights', 'Machines', 'Players', 'Seasons', 'Scoring', 'socket'];

	var AdminMenuController = function($scope, dialog, api, adminMenu, Auth, LeagueNights, Machines, Players, Seasons, Scoring, socket){
		
		$scope.auth = Auth;
		$scope.user = Auth.user;
		$scope.season = Seasons;

		$scope.show_scoring = false;
		$scope.scoring_night_starts = false;

		$scope.ties = [];
		$scope.scoring_groups = null;
		$scope.nights  = null;
		$scope.users = null;
		$scope.seasons = null;
		$scope.machines = null;
		$scope.scoring = Scoring;

		$scope.close = function close(){
			adminMenu.close();
		}
		
		$scope.sectionCollapsed = function(closed, section){
			// console.log(section, closed);
		};

		$scope.startScoring = function(){
			Scoring.start($scope.scoring_night_starts)
			.catch(function(err){
				dialog(err);
			});
		};

		$scope.stopScoring = function(){
			Scoring.stop()
			.catch(function(err){
				dialog(err);
			});
		};

		LeagueNights.loading
		.then(function(nights){
			$scope.nights = LeagueNights.nights;

			var scoring_night = _.find($scope.nights, 'today');
			if(scoring_night != undefined){
				$scope.show_scoring = true;
				$scope.scoring_night_starts = scoring_night.starts;
			}
		});

		Machines.loading
		.then(function(machines){
			$scope.machines = _.groupBy(Machines.all, 'active');
		});

		Players.getAllPlayers()
		.then(function(players){
			$scope.users = _.groupBy(players, 'active');
		});

		Seasons.loading
		.then(function(){
			$scope.seasons = Seasons.all;
		});

		api.get('leaguenight.ties', LeagueNights.getNextOrMostRecentNight(true).starts)
		.then(function(ties){
			_.each(ties, function(group){
				var data = {
					name_key: group[0].name_key,
					names: []
				};

				data.names = _.map(group, function(player){
					return player.first_name+' '+player.last_name[0]+'.';
				});
				$scope.ties.push(data);
			});
		});

		/*
		 *	Socket Events
		*/
		function tiesbroken(d){
			// remove the tie
			var idx = _.indexOf($scope.ties, _.find($scope.ties, {'name_key': d.name_key}));
			$scope.ties.splice(idx, 1);
		};

		function scoringStarted(d){
			$scope.show_scoring = true;
			$scope.scoring_night_starts = d.starts;

			$scope.scoring_groups = _.chain(Scoring.night.divisions)
				.pluck('player_list')
				.pluck('players')
				.flatten()
				.groupBy('grouping')
				.map(function(g, i){
					var obj = {
						initials: _.pluck(g, 'initials'),
						name_key: g[0].name_key,
						machines: g[0].machines,
						players: g,
						order: parseInt(i, 10)
					};

					var finished_machines = _.countBy(obj.machines);
					switch(finished_machines[""]){
						case undefined:
						case 0:
							obj.status = 'on';
							break;
						case 5:
							obj.status = 'off';
							break;
						default:
							obj.status = 'half';
					};

					return obj;
				})
				.value();

			/*
			var groups = _.chain(Scoring.night.divisions)
				.map(function(obj){ return obj.player_list.players })
				.flatten()
				.groupBy('grouping')
				.value();

			_.each(groups, function(group, i){
				group = {
					players: group
				}

				group.initials = _.pluck(group.players, 'initials');
				group.name_key = group.players[0].name_key;
				group.machines = group.players[0].machines;
				group.order = parseInt(i, 10);
				
				var finished_machines = _.countBy(group.players.machines);
				switch(finished_machines[""]){
					case undefined:
					case 0:
						group.status = 'on';
						break;
					case 5:
						group.status = 'off';
						break;
					default:
						group.status = 'half';
				};

			});
			$scope.scoring_groups = groups;
			*/
		};
		
		if(Scoring.started){
			scoringStarted({starts: Scoring.night.starts});
		}

		function scoringUpdated(d){
			// find the group and update the status
			var updated_players = _.keys(d.players);
			var group = _.find($scope.scoring_groups, function(group){
				return _.contains(updated_players, group.name_key);
			});

			var finished_machines = _.countBy(group.machines);
			switch(finished_machines[""]){
				case undefined:
				case 0:
					group.status = 'on';
					break;
				case 5:
					group.status = 'off';
					break;
				default:
					group.status = 'half';
			};
		}


		socket
			.on('tiesbroken', tiesbroken)
			.on('scoring_started', scoringStarted)
			.on('scoring_update', scoringUpdated);


	};

	AdminMenuController.$inject = injectParams;
	app.controller('AdminMenuController', AdminMenuController);
});