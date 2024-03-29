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
		});

		Machines.loading
		.then(function(machines){
			$scope.machines = Machines.all;
		});

		Players.getAllPlayers()
		.then(function(){
			$scope.users =Players.all;
		});

		Seasons.loading
		.then(function(){
			$scope.seasons = Seasons.all;
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
						machines: [],
						players: g,
						order: parseInt(i, 10)
					};

					_.each(g[0].machines, function(machine){
						obj.machines.push(machine.abbv);
					});
					
					switch(obj.machines.length){
						case 0:
							obj.status = 'off';
							break;
						case 5:
							obj.status = 'on';
							break;
						default:
							obj.status = 'half';
					};
					

					return obj;
				})
				.value();
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

			if(group.machines == null){
				group.machines = [];
			}
			group.machines[d.played_order] = d.abbv;

			switch(group.machines.length){
				case undefined:
				case 0:
					group.status = 'off';
					break;
				case 5:
					group.status = 'on';
					break;
				default:
					group.status = 'half';
			};
		}


		function leaguenightUpdated(data){
			var m = moment(data.starts),
				today = moment().startOf('day');

			if(m.isSame(today)){
				$scope.show_scoring = true;
				$scope.scoring_night_starts = data.starts;
			}
		};


		socket
			.on('tiesbroken', tiesbroken)
			.on('scoring_started', scoringStarted)
			.on('scoring_update', scoringUpdated)
			.on('leaguenight_updated', leaguenightUpdated);


	};

	AdminMenuController.$inject = injectParams;
	app.controller('AdminMenuController', AdminMenuController);
});