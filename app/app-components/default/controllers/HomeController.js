define(['js/app'], function(app){

	var injectParams = ['$scope', 'Auth'];

	var HomeCtrl = function($scope, Auth){
		$scope.greet = 'checking';
		
		Auth.logging_in.promise
		.then(function(user){
			$scope.greet = user.first_name;
		})
		.catch(function(){
			$scope.greet = 'World';
		});

		$scope.user = Auth.user;
		
	};

	HomeCtrl.$inject = injectParams;
	app.register.controller('HomeController', HomeCtrl);
});