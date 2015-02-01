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

		function scoringStarted(d){
			$scope.show_scoring = true;
			$scope.scoring_night_starts = d.starts;

			var groups = _.chain(Scoring.night.divisions)
				.map(function(obj){ return obj.player_list.players })
				.flatten()
				.groupBy('grouping')
				.value();

			_.each(groups, function(group){
				group.initials = _.pluck(group, 'initials');
				group.name_key = group[0].name_key;
				group.machines = group[0].machines;
				
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

			});

			$scope.scoring_groups = groups;
		};

		if(Scoring.started){
			scoringStarted({starts: Scoring.night.starts});
		}

		function tiesbroken(d){
			// remove the tie
			var idx = _.indexOf($scope.ties, _.find($scope.ties, {'name_key': d.name_key}));
			$scope.ties.splice(idx, 1);
		};


		socket
			.on('scoring_started', scoringStarted)
			.on('tiesbroken', tiesbroken);


	};

	AdminMenuController.$inject = injectParams;
	app.controller('AdminMenuController', AdminMenuController);
});