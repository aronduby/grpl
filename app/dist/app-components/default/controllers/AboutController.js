define(function(require){
	var 
		app        = require('js/app'),
		Markdown   = require('app-components/directives/Markdown'),
		pageEditor = require('app-components/directives/PageEditor');
		


	var injectParams = ['$scope', '$q', 'api', 'ipCookie', 'loadingOverlayApi', 'navApi', 'Machines', 'Seasons', 'Players', '$modal'];

	var AboutController = function($scope, $q, API, ipCookie, loadingOverlayApi, navApi, Machines, Seasons, Players, $modal){
		navApi.defaultTitle();
		loadingOverlayApi.show();

		// used with markdown directive
		$scope.tpls = {
			machinelist: 'app-components/partials/about-machine-list.html'
		};

		$scope.page = {
			content: '# loading, please wait',
			ignore: true
		};
		
		$scope.machines = [];
		$scope.seasons = [];
		$scope.players = [];

		$scope.loading = function(){
			loadingOverlayApi.toggle();
		}

		var machine_promise = Machines.loading,
			seasons_promise = Seasons.loading,
			players_promise = Players.loading,
			page_promise = API.get('page.url', 'about');

		machine_promise.then(function(){ $scope.machines = Machines.active; });
		seasons_promise.then(function(){ $scope.seasons = Seasons.all; });
		players_promise.then(function(){ $scope.players = Players.players; });
		page_promise.then(function(page){
			$scope.page = page;
		});


		$q.all([machine_promise, seasons_promise, players_promise, page_promise])
		.then((function(){
			loadingOverlayApi.hide();
		}));

		ipCookie('skipabout', '1', {expires: 120, secure: true});

		// markdown help for admin editing
		$scope.help = {
			variables: [
				{name: 'machines', description: 'An array of all of the active machines in the system. To get the count of machines use <code>{{ machines.length }}</code>.'},
				{name: 'seasons', description: 'An array of all the seasons. To display what number of season we\'re in use <code>{{ seasons.length | ordinal }}</code>.'},
				{name: 'players', description: 'An array of all the active players. To get the count use <code>{{ players.length }}</code>.'}
			],
			templates: [
				{name: 'machinelist', description: 'An alphabetical listing of all the active machines.'}
			]
		};

	};

	AboutController.$inject = injectParams;
	app.register.controller('AboutController', AboutController);
});