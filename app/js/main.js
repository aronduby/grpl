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
		'app-components/services/LeagueNights',
		'app-components/filters/pluck',
		'app-components/filters/joinBy',
		'app-components/filters/mathAbs',
		'app-components/filters/notZero',
		'app-components/controllers/SocketStatusController',
		'app-components/controllers/NavController',
		'app-components/directives/AccessLevel',
		'app-components/directives/Collapsible',
		'app-components/directives/InlineModal',
		'app-components/LoadingOverlay'
	],
	function () {
		// defer bootstrap till called by our socket connection
		window.name = 'NG_DEFER_BOOTSTRAP!';

		angular.bootstrap(document, ['grpl']);
	});