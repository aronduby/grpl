define(['js/app'], function(app){

	var injectParams = ['$scope', 'navApi', 'loadingOverlayApi', '$timeout', 'inlineModalApi', '$modal'];

	var PlaygroundController = function($scope, navApi, loadingOverlayApi, $timeout, inlineModalApi, $modal ){
		
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

		// inline modals
			$scope.openHomepagePanel = function(){
				inlineModalApi.open('homepage-panel');
			}

			$scope.testModal = function(){
				$modal.open({
					template: '<p><a href="#/about">about</a></p>'
				})
			}
	};

	PlaygroundController.$inject = injectParams;
	app.register.controller('PlaygroundController', PlaygroundController);
});