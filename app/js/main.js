require.config({
    baseUrl: ''
});

require(
	[
		'js/app',
		'app-components/services/routeResolver',
		'app-components/services/socket',
		'app-components/services/api',
		'app-components/controllers/SocketStatusController',
		'app-components/directives/AccessLevel',
		'app-components/directives/ActiveNav'
	],
	function () {
		angular.bootstrap(document, ['grpl']);
	});