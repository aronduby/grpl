require.config({
    baseUrl: ''
});

require(
	[
		'js/routingConfig',
		'js/app',
		'app-components/services/routeResolver',
		'app-components/services/socket',
		'app-components/services/api',
		'app-components/controllers/SocketStatusController',
		'app-components/controllers/NavController',
		'app-components/directives/AccessLevel',
		'app-components/directives/ActiveNav',
		'app-components/AdminMenu'
	],
	function () {
		angular.bootstrap(document, ['grpl']);
	});