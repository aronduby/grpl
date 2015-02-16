define([], function(){

	// var injectParams = ['$scope', '$modalInstance', 'Machines'];

	var RandomizerController = function($scope, $modalInstance, Machines){	

		$scope.machine = null;
		$scope.order = ['1','2','3','4'];

		$scope.randomize = function(){
			$scope.machine = Machines.randomMachine();
			$scope.order = _.shuffle($scope.order);
		};
		$scope.randomize();

		$scope.close = function(){
			$modalInstance.close();
		};
	};

	// Modal Controller just needs to be a function
	// RandomizerController.$inject = injectParams;
	// app.register.controller('RandomizerController', RandomizerController);

	return RandomizerController;
});