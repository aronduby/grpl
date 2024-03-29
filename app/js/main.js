﻿requirejs.config({
    baseUrl: '',
    paths: {
    	showdown: 'bower_components/showdown/src/showdown'
    }
});

require(
	[
		'app-components/services/socket',
		'js/routingConfig',
		'js/app',
		'app-components/services/routeResolver',
		'app-components/services/NavApi',
		'app-components/services/LeagueNights',
		'app-components/services/Machines',
		'app-components/services/Players',
		'app-components/services/Seasons',
		'app-components/services/Scoring',
		'app-components/services/dialog',
		'app-components/services/SocketMessages',
		'app-components/services/Push',
        'app-components/services/IFPA',
		'app-components/filters/pluck',
		'app-components/filters/joinBy',
		'app-components/filters/mathAbs',
		'app-components/filters/notZero',
		'app-components/controllers/SocketStatusController',
		'app-components/controllers/NavController',
		'app-components/controllers/FooterController',
		'app-components/controllers/AdminMenuController',
		'app-components/directives/AccessLevel',
		'app-components/directives/Collapsible',
		'app-components/directives/InlineModal',
		'app-components/directives/Slip',
		'app-components/directives/Abbr',
		'app-components/BodyClasses',
		'app-components/LoadingOverlay'
	],
	function (socket_connection) {
		var bootstrapped = false;

		socket_connection.then(function(socket){
			if(bootstrapped === false){
				console.log('boostrapping');
				angular.bootstrap(document, ['grpl']);
				bootstrapped = true;	
			}
		});

		// add pluck back in instead of doing a bunch of work finding and replacing
        function pluck(collection, fld) {
            // console.error('_.pluck');
            return _.map(collection, function(obj){
               return obj[fld];
            });
        }

        function contains(haystack, needle){
            console.error('_.contains');
            return _.includes(haystack, needle);
        }

        _.mixin({
            'pluck': pluck,
            'contains': contains
        });
		
	});