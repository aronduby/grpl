define(['js/app'], function(app){

	var injectParams = ['$scope', 'navApi', 'loadingOverlayApi', '$timeout'];

	var PlaygroundController = function($scope, navApi, loadingOverlayApi, $timeout ){
		
		// navApi
			$scope.title = '';
			$scope.subtitle = '';

			$scope.setTitle = function(){
				navApi.setTitle($scope.title, $scope.subtitle);
			}

			$scope.defaultTitle = function(){
				navApi.defaultTitle();
			}


		// loadingOverlayApi
			$scope.loading = function(ms){
				loadingOverlayApi.show();
				$timeout(function(){
					loadingOverlayApi.hide();
				}, ms);
			}
		
	};

	PlaygroundController.$inject = injectParams;
	app.register.controller('PlaygroundController', PlaygroundController);
});