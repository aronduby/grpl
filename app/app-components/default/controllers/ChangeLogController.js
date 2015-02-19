define(['js/app', 'app-components/filters/bugifyLink', 'app-components/filters/curses'], function(app){

	var injectParams = ['$scope', '$filter', 'navApi', 'api', 'loadingOverlayApi'];

	var ChangeLogController = function($scope, $filter, navApi, api, loadingOverlayApi){
		loadingOverlayApi.show();
		navApi.setTitle('Change Log', 'Why?');

		$scope.curses = [
			"fuck", 
			"bitch",
			" tits", 
			"asshole", 
			"cocksucker", 
			"cunt", 
			" hell ", 
			"douche", 
			"testicle", 
			"twat", 
			"bastard", 
			"sperm", 
			"shit", 
			"dildo", 
			"wanker", 
			"prick", 
			"penis", 
			"vagina", 
			"whore",
			"damn"
		];

		api.get('changelog')
		.then(function(log){
			loadingOverlayApi.hide();
			$scope.log = log;
		});


		// not 100% sure why this works, but its from https://github.com/a8m/angular-filter/issues/57
		$scope.properGroupOrder = function(arr) {
			return $filter('min')
				($filter('map')(arr, 'pushed'));
		}

		$scope.pushedToSeconds = function(obj){
			return moment(obj.$key).unix();
		}

		
	};

	ChangeLogController.$inject = injectParams;
	app.register.controller('ChangeLogController', ChangeLogController);
});