define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', 'api', 'ipCookie', 'loadingOverlayApi', 'navApi', 'promiseTracker'];

	var AboutController = function($scope, $q, API, ipCookie, loadingOverlayApi, navApi, promiseTracker){
		navApi.defaultTitle();
		loadingOverlayApi.show();
		
		$scope.machines = [];
		$scope.seasons = [];
		$scope.players = [];

		$scope.loading = function(){
			loadingOverlayApi.toggle();
		}

		var machine_promise = API.get('machine.active'),
			seasons_promise = API.get('seasons.getAll'),
			players_promise = API.get('players.active');

		machine_promise.then(function(machines){ $scope.machines = machines; });
		seasons_promise.then(function(seasons){ $scope.seasons = seasons; });
		players_promise.then(function(players){ $scope.players = players; });


		$q.all([machine_promise, seasons_promise, players_promise])
		.then((function(){
			loadingOverlayApi.hide();
		}));


		ipCookie('skipabout', '1', {expires: 120});
	};

	AboutController.$inject = injectParams;
	app.register.controller('AboutController', AboutController);
});