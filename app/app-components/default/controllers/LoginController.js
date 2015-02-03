define(['js/app'], function(app){

	var LoginController = function($scope, $modalInstance, Auth, loadingOverlayApi, dialog){

		$scope.email = null;
		$scope.password = null;

		$scope.loginWithFB = function(){
			loadingOverlayApi.show();			
			Auth.loginWithFacebook()
			.then(function(player){
				$modalInstance.dismiss(player);
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		};

		$scope.loginWithForm = function(){
			loadingOverlayApi.show();			
			Auth.loginWithForm($scope.email, $scope.password)
			.then(function(player){
				$modalInstance.dismiss(player);
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		};
		
		$scope.cancel = function(){
			$modalInstance.dismiss(false);
		};
	};

	return LoginController;

});