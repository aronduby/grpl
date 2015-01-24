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



	var injectParams = ['$scope', 'api', 'adminMenu', 'Auth', 'LeagueNights', 'Machines', 'Players', 'Seasons'];

	var AdminMenuController = function($scope, api, adminMenu, Auth, LeagueNights, Machines, Players, Seasons){
		
		$scope.auth = Auth;
		$scope.user = Auth.user;
		$scope.season = Seasons;

		$scope.show_scoring = true;

		$scope.ties = [];
		$scope.scoring_groups = null;
		$scope.nights  = null;
		$scope.users = null;
		$scope.seasons = null;
		$scope.machines = null;

		$scope.close = function close(){
			adminMenu.close();
		}
		
		$scope.sectionCollapsed = function(closed, section){
			// console.log(section, closed);
		}

		LeagueNights.loading
		.then(function(nights){
			$scope.nights = LeagueNights.nights;
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

		api.get('leaguenight.ties', LeagueNights.getNextOrMostRecentNight().starts)
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
		})


	};

	AdminMenuController.$inject = injectParams;
	app.controller('AdminMenuController', AdminMenuController);
});