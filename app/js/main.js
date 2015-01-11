require.config({
    baseUrl: ''
});

require(
	[
		'js/routingConfig',
		'js/app',
		'app-components/services/routeResolver',
		'app-components/services/socket',
		'app-components/services/NavApi',
		'app-components/services/api',
		'app-components/filters/pluck',
		'app-components/filters/joinBy',
		'app-components/controllers/SocketStatusController',
		'app-components/controllers/NavController',
		'app-components/directives/AccessLevel',
		'app-components/directives/Collapsible',
		'app-components/LoadingOverlay'
	],
	function () {
		angular.bootstrap(document, ['grpl']);
	});