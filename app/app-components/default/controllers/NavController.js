define(['js/app'], function(app){

	app.controller('NavController', ['navApi', '$scope', 'inlineModalApi', function(navApi, $scope, inlineModalApi) {
		$scope.api = navApi;

		$scope.$watchGroup(['api.title', 'api.subtitle'], function(newValues, oldValues, scope){
			$scope.title = newValues[0];
			$scope.subtitle = newValues[1];
		});

		$scope.toggleCenterPanel = function(){
			if(navApi.center_panel_key)
				inlineModalApi.open( navApi.center_panel_key );
		}
	}])

	return app;
});