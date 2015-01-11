'use strict';

define([
	'js/routingConfig',
	'app-components/services/routeResolver', 
	'app-components/services/auth'
], 
function(routingConfig){

	var app = angular.module('grpl', [
			'ngAnimate',
			'ui.router',
			'ui.bootstrap',
			'ipCookie',
			'routeResolverServices',
			'socketServices',
			'ajoslin.promise-tracker',
			'angular-flare',
			'AdminMenu'
		]);

	app.config([
		'$stateProvider', '$urlRouterProvider', '$locationProvider', 'socketProvider', 'routeResolverProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', 
		function($stateProvider, $urlRouterProvider, $locationProvider, socketProvider, routeResolverProvider, $controllerProvider, $compileProvider, $filterProvider, $provide){

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

			// access levels
			var access = routingConfig.accessLevels;

			// Public Routes
			$stateProvider
				.state('public', {
					abstract: true,
					template: "<ui-view />",
					data:{
						access: access.public
					}
				})
				
				.state('public.nights', route.resolve({
					url: '/nights/:starts',
					baseName: 'Nights'
				}))
				.state('public.users', route.resolve({
					url: '/players',
					baseName: 'Players'
				}))
				.state('public.about', route.resolve({
					url: '/about',
					baseName: 'About'
				}))
				.state('public.loginTest', route.resolve({
					url: '/loginTest',
					baseName: 'LoginTest'
				}))
				.state('public.innerPage', route.resolve({
					url: '/innerPage',
					baseName: 'InnerPage'
				}));


			// Admin Routes
			$stateProvider
				.state('admin', {
					abstract: true,
					template: '<ui-view />',
					data:{
						access: access.admin
					}
				})
				.state('admin.ties', route.resolve({
					url: '/admin/ties',
					path: 'admin/',
					baseName: 'Ties'
				}))

			$urlRouterProvider.otherwise('/nights');


			// FIX for trailing slashes. Gracefully "borrowed" from https://github.com/angular-ui/ui-router/issues/50
			// without this /path is different from /path/
			$urlRouterProvider.rule(function($injector, $location) {
				if($location.protocol() === 'file')
					return;

				var path = $location.path()
					// Note: misnomer. This returns a query object, not a search string
					, search = $location.search()
					, params
					;

					// check to see if the path already ends in '/'
					if (path[path.length - 1] === '/') {
						return;
					}

					// If there was no search string / query params, return with a `/`
					if (Object.keys(search).length === 0) {
						return path + '/';
					}

					// Otherwise build the search string and return a `/?` prefix
					params = [];
					angular.forEach(search, function(v, k){
						params.push(k + '=' + v);
					});
					return path + '/?' + params.join('&');
			});

		}
	]);

	app.run([
		'$rootScope', '$state', 'socket', 'api', 'ipCookie', 'Auth', 'flare', '$location',
		function($rootScope, $state, socket, api, ipCookie, Auth, flare, $location){
			api.setSocket(socket);
			Auth.tryLogin();

			// set the season cookie to whatever the node server thinks it is
			api.get('getSeason')
			.then(function(season){
				ipCookie('season_id', season.active);
			});

			/*
			 *	Checks that the Auth User has the proper access to view the new "route"
			*/
			var locationSearch = null;
			$rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
				//save location.search so we can add it back after transition is done
				locationSearch = $location.search();

				if (!Auth.authorize(toState.data.access)) {
					flare.error("Seems like you tried accessing a route you don't have access to...", 3000);
					event.preventDefault();

					if(Auth.isLoggedIn()){
						$state.go('user.home');
					} else {
						$state.go('anon.login');
					}
				}
			});

			$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
				//restore all query string parameters back to $location.search
				$location.search(locationSearch);
			});
		}
	]);


	return app;

});