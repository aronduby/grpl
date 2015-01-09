'use strict';

define([
	'app-components/services/routeResolver', 
	'app-components/services/auth'
], 
function(){

	var app = angular.module('grpl', [
			'ngRoute',
			'ui.bootstrap',
			'ipCookie',
			'routeResolverServices',
			'socketServices',
			'ajoslin.promise-tracker',
			'angular-flare'
		]);

	app.config([
		'socketProvider', 'routeResolverProvider', '$routeProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', 
		function(socketProvider, routeResolverProvider, $routeProvider, $controllerProvider, $compileProvider, $filterProvider, $provide){

			socketProvider.setAddress('http://'+window.location.host+':834');
			socketProvider.setOptions({
				'sync disconnect on unload': true,
				'max reconnection attempts': 5
			});
			

			//Change default views and controllers directory using the following:
			routeResolverProvider.routeConfig.setBaseDirectories('app-components/views/', 'app-components/controllers/');

			app.register = {
				controller: $controllerProvider.register,
				directive: $compileProvider.directive,
				filter: $filterProvider.register,
				factory: $provide.factory,
				service: $provide.service
			};

			//Define routes - controllers will be loaded dynamically
			var route = routeResolverProvider.route;

			$routeProvider
				.when('/home', route.resolve('Home'))
				.when('/loginTest', route.resolve('LoginTest'))
				.otherwise({redirectTo: '/home'});

		}
	]);

	app.run([
		'socket', 'api', 'ipCookie', 'Auth',
		function(socket, api, ipCookie, Auth){
			api.setSocket(socket);
			Auth.tryLogin();

			// set the season cookie to whatever the node server thinks it is
			api.get('getSeason')
			.then(function(season){
				ipCookie('season_id', season.active);
			});		
		}
	]);


	return app;

});