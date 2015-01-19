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

		$scope.ties = null;
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
			$scope.machines = Machines.all;
		});

		Players.loading
		.then(function(players){
			$scope.users = Players.players;
		});

		Seasons.loading
		.then(function(){
			$scope.seasons = Seasons.all;
		});

		api.get('leaguenight.ties', LeagueNights.getNextOrMostRecentNight().starts)
		.then(function(ties){
			console.log(ties);
		})


	};

	AdminMenuController.$inject = injectParams;
	app.controller('AdminMenuController', AdminMenuController);
});