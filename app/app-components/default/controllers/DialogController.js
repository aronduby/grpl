define([], function(){

	// var injectParams = ['$scope', '$modalInstance', 'Machines'];

	var DialogController = function($scope, $modalInstance, title, headline, msg, additional_classes, btn_text){	

		$scope.title = title;
		$scope.headline = headline;
		$scope.msg = msg;
		$scope.additional_classes = additional_classes;
		$scope.btn_text = btn_text;

		$scope.confirm = function(){
			$modalInstance.close(true);
		};

		$scope.cancel = function(){
			$modalInstance.dismiss(false);
		};
	};

	// Modal Controller just needs to be a function
	// DialogController.$inject = injectParams;
	// app.register.controller('DialogController', DialogController);

	return DialogController;
});