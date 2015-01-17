define(['js/app'], function(app){
	
	app.directive('headToHead', [function() {
		return {
			scope: {
				data: '='
			},
			templateUrl: 'app-components/partials/head-to-head.html'
		};
	}])

	return app;
});