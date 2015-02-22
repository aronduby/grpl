define(function(require){
	var 
		app          = require('js/app'),
		Markdown     = require('app-components/directives/Markdown');
		


	var injectParams = ['$scope', '$q', 'api', 'ipCookie', 'loadingOverlayApi', 'navApi', 'Machines', 'Seasons', 'Players'];

	var AboutController = function($scope, $q, API, ipCookie, loadingOverlayApi, navApi, Machines, Seasons, Players){

		$scope.tpls = {
			machinelist: 'app-components/partials/about-machine-list.html'
		};

		navApi.defaultTitle();
		loadingOverlayApi.show();
		
		$scope.machines = [];
		$scope.seasons = [];
		$scope.players = [];

		$scope.loading = function(){
			loadingOverlayApi.toggle();
		}

		var machine_promise = Machines.loading,
			seasons_promise = Seasons.loading,
			players_promise = Players.loading;

		machine_promise.then(function(){ $scope.machines = Machines.active; });
		seasons_promise.then(function(){ $scope.seasons = Seasons.all; });
		players_promise.then(function(){ $scope.players = Players.players; });


		$q.all([machine_promise, seasons_promise, players_promise])
		.then((function(){
			loadingOverlayApi.hide();
		}));

		ipCookie('skipabout', '1', {expires: 120});

	};

	AboutController.$inject = injectParams;
	app.register.controller('AboutController', AboutController);
});