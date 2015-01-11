define(['js/app'], function(app){

	var injectParams = ['$stateParams', '$scope', 'Auth'];

	var NightsController = function($stateParams, $scope, Auth){
		$scope.user = Auth.user;
		$scope.params = $stateParams;
		
		
		if($stateParams.starts === ''){
			$stateParams.starts = 'totals';
		}
		
		
	};

	NightsController.$inject = injectParams;
	app.register.controller('NightsController', NightsController);
});