define(function(require){
	var	
		app        = require('js/app'),
		bugifylink = require('app-components/filters/bugifyLink'),
		curses     = require('app-components/filters/curses'),
		Markdown   = require('app-components/directives/Markdown'),
		pageEditor = require('app-components/directives/PageEditor');

	var injectParams = ['$scope', '$q', '$filter', 'navApi', 'api', 'loadingOverlayApi', '$modal'];

	var ChangeLogController = function($scope, $q, $filter, navApi, api, loadingOverlayApi, $modal){
		loadingOverlayApi.show();
		navApi.setTitle('Change Log', 'Why?');

		$scope.tpls = {
			changelog: 'app-components/partials/changelog.html'
		};

		$scope.page = {
			content: '# loading, please wait',
			ignore: true
		};

		var promises = {
			log: api.get('changelog'),
			page: api.get('page.url', 'changelog')
		};

		$q.all(promises)
		.then(function(resolved){
			$scope.log = resolved.log;
			$scope.page = resolved.page;

			loadingOverlayApi.hide();
		});

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
			"damn",
			" ass "
		];


		// not 100% sure why this works, but its from https://github.com/a8m/angular-filter/issues/57
		$scope.properGroupOrder = function(arr) {
			return $filter('min')
				($filter('map')(arr, 'pushed'));
		}

		$scope.pushedToSeconds = function(obj){
			return moment(obj.$key).unix();
		}


		// pageeditor/markdown help for admin editing
		$scope.help = {
			variables: [
				{name: 'log', description: 'An array of all of the changes. To get the count of the changes use <code>{{ log.length }}</code>.'}
			],
			templates: [
				{name: 'changelog', description: 'The formatted listing of all the changes that have been made.'}
			]
		};
		
	};

	ChangeLogController.$inject = injectParams;
	app.register.controller('ChangeLogController', ChangeLogController);

});