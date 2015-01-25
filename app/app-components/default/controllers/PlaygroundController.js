define(['js/app', 'app-components/services/dialog'], function(app){

	var injectParams = ['$scope', 'navApi', 'loadingOverlayApi', '$timeout', 'inlineModalApi', '$modal', 'dialog'];

	var PlaygroundController = function($scope, navApi, loadingOverlayApi, $timeout, inlineModalApi, $modal, dialog ){
		
		// navApi
			$scope.title = '';
			$scope.subtitle = '';

			$scope.setTitle = function(){
				navApi.setTitle($scope.title, $scope.subtitle);
			}

			$scope.defaultTitle = function(){
				navApi.defaultTitle();
			}

			$scope.setCenterPanel = function(key){
				navApi.setCenterPanelKey(key);
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

		// dialogs
			$scope.dialog_options = {
				title: 'title',
				headline: 'headline',
				msg: 'some message here',
				additional_classes: 'classes',
				btn_text:'ok'
			};

			$scope.openDialog = function(){
				var confirm = dialog($scope.dialog_options);

				confirm.result
				.then(function(d){
					console.info('modal closed', d);
				})
				.catch(function(d){
					console.error('modal dismissed', d);
				})
				.finally(function(){
					console.info('modal gone');
				});
			}


		loadingOverlayApi.hide();

	};

	PlaygroundController.$inject = injectParams;
	app.register.controller('PlaygroundController', PlaygroundController);
});