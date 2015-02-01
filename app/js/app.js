'use strict';

define([
	'js/routingConfig',
	'app-components/services/routeResolver', 
	'app-components/services/auth'
], 
function(routingConfig){

	var app = angular.module('grpl', [
			//'ngAnimate',
			'ngSanitize',
			'angular.filter',
			'ordinal',
			'ui.router',
			'ui.bootstrap',
			'ipCookie',
			'routeResolverServices',
			'socketServices',
			'ajoslin.promise-tracker',
			'angular-flare',
			'BodyClasses',
			'LoadingOverlay',
			'ordinal',
			'ngStorage',
			'ui.chart',
			'slip',
			'ngOptionsDisabled'
		]);

	app.config([
		'$stateProvider', '$urlRouterProvider', '$locationProvider', 'socketProvider', 'navApiProvider', 'routeResolverProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', 
		function($stateProvider, $urlRouterProvider, $locationProvider, socketProvider, navApiProvider, routeResolverProvider, $controllerProvider, $compileProvider, $filterProvider, $provide){

			navApiProvider.setDefaults('GRPL', 'Grand Rapids Pinball League');
			

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
					url: '/index/:starts',
					baseName: 'Nights'
				}))
				.state('public.about', route.resolve({
					url: '/about',
					baseName: 'About'
				}))
				.state('public.users', route.resolve({
					url: '/players/:name_key',
					baseName: 'Players'
				}))
				.state('public.changelog', route.resolve({
					url: '/changelog',
					baseName: 'ChangeLog'
				}))
				.state('public.playground', route.resolve({
					url: '/playground',
					baseName: 'Playground'
				}));

			// User Routes
			$stateProvider
				.state('user', {
					abstract: true,
					template: '<ui-view />',
					data: {
						access: access.user,
						currentSeasonOnly: true
					}
				})
				.state('user.scoring', route.resolve({
					url: '/scoring/:offset',
					baseName: 'Scoring'
				}));


			// Admin Routes
			$stateProvider
				.state('admin', {
					abstract: true,
					template: '<ui-view />',
					data:{
						access: access.admin,
						currentSeasonOnly: true
					}
				})
				.state('admin.tiebreaker', route.resolve({
					url: '/admin/tiebreaker/:name_key',
					path: 'admin/',
					baseName: 'AdminTiebreaker'
				}))
				.state('admin.nights', {
					abstract: true,
					template: '<ui-view />'
				})
					.state('admin.nights.edit', route.resolve({
						url: '^/admin/nights/:starts',
						path: 'admin/',
						baseName: 'AdminNights'
					}))
					.state('admin.nights.order', route.resolve({
						url:'^/admin/nights/order/:starts',
						path: 'admin/',
						baseName: 'AdminNightsOrder'
					}))
				.state('admin.users', route.resolve({
					url:'/admin/users/:name_key',
					path: 'admin/',
					baseName: 'AdminUsers'
				}))
				.state('admin.seasons', route.resolve({
					url: '/admin/seasons/:season_id',
					path: 'admin/',
					baseName: 'AdminSeasons'
				}))
				.state('admin.machines', route.resolve({
					url: '/admin/machines/:abbv',
					path: 'admin/',
					baseName: 'AdminMachines'
				}))
				.state('admin.scoring', route.resolve({
					url: '/admin/scoring/:name_key/:offset',
					baseName: 'Scoring'
				}));

			$urlRouterProvider.otherwise('/index');


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
		'$rootScope', '$window', '$state', 'socket', 'api', 'SocketMessages', 'ipCookie', 'Auth', 'flare', '$location', '$modalStack', '$templateCache', 'LeagueNights', 'Machines', 'Players', 'Seasons', 'Scoring', '$timeout',
		function($rootScope, $window, $state, socket, api, SocketMessages, ipCookie, Auth, flare, $location, $modalStack, $templateCache, LeagueNights, Machines, Players, Seasons, Scoring, $timeout){
			// override the default flare tpl to add ability to do html in message content
			$templateCache.put("directives/flaremessages/index.tpl.html",
			    "<div ng-repeat=\"(key,message) in flareMessages\" ng-class=\"classes(message)\">\n" +
			    "  <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\" ng-click=\"dismiss(key)\">&times;</button>\n" +
			    "  <div ng-bind-html=\"message.content\"></div>\n" +
			    "</div>\n" +
			"");

			api.setSocket(socket); // I don't think this is necessary any more?
			LeagueNights.loadNights();
			Machines.loadMachines();
			Players.loadPlayers();
			Seasons.loadSeasons();
			Scoring.emitIfStarted();

			socket.on('write_cookie', function(key,val){
				ipCookie(key, val);
			})
			
			$rootScope.auth = Auth;
			$rootScope.admin = false;
			$rootScope.$watch('auth.user', function(user){
				$rootScope.admin = Auth.authorize('admin');
			}, true);

			var logging_in = Auth.tryLogin();

			// set the season cookie to whatever the node server thinks it is
			api.get('getSeason')
			.then(function(season){
				Seasons.setActive(season.active);
				Seasons.setCurrent(season.current);
				ipCookie('season_id', season.active);
			});

			/*
			 *	Checks that the Auth User has the proper access to view the new "route"
			*/
			var locationSearch = null;
			$rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
				$modalStack.dismissAll(); // close all open modals

				//save location.search so we can add it back after transition is done
				locationSearch = $location.search();

				// add a check to see if we're loggin in and then run after the promise is done?
				logging_in.finally(function(){
					if (!Auth.authorize(toState.data.access)) {
						flare.error("Seems like you tried accessing a route you don't have access to...", 3000);
						event.preventDefault();

						if(Auth.isLoggedIn()){
							$state.go('public.nights');
						} else {
							$state.go('anon.login');
						}
					}
				});				

				if(toState.data.currentSeasonOnly){
					if(Seasons.active_id !== Seasons.current_id){
						flare.error('That page is unavailable when you are in a past season. To view the current season click the button in the big red header.');
						event.preventDefault();
						$state.go('public.nights');
					}
				}
			});

			$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
				//restore all query string parameters back to $location.search
				$location.search(locationSearch);
				$window.scrollTo(0,0);
			});
		}
	]);


	return app;

});