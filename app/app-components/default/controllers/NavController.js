define(['js/app'], function(app){

	app.controller('NavController', ['navApi', '$rootScope', '$scope', '$state', 'Auth', 'flare', function(navApi, $rootScope, $scope, $state, Auth, flare) {
		$scope.api = navApi;

		$scope.$watchGroup(['api.title', 'api.subtitle'], function(newValues, oldValues, scope){
			$scope.title = newValues[0];
			$scope.subtitle = newValues[1];
		});
	}])

	return app;
});