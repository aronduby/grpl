define(['js/app'], function(app){

	var injectParams = ['$scope', 'socket', 'api', 'Auth', 'promiseTracker'];

	var LoginTestCtrl = function($scope, scoket, api, Auth, promiseTracker){
		$scope.greet = 'World';
		$scope.user = Auth.user;

		$scope.email = 'aron.duby@gmail.com';
		$scope.password = 'rileyst1';

		$scope.loginTracker = promiseTracker();
		$scope.loginTracker.addPromise(Auth.logging_in.promise);
		$scope.lip = Auth.logging_in.promise;

		$scope.tryLogin = function(){
			Auth.tryLogin()
			.then(
				function(){
					console.log('success', arguments);
				},
				function(){
					console.error('error', arguments);
				}
			);
		};

		$scope.loginWithFacebook = function(){
			Auth.loginWithFacebook();
		};

		$scope.loginWithForm = function(){
			Auth.loginWithForm($scope.email, $scope.password)
			.then(function(){
				console.log('success', arguments);
			}, function(){
				console.error('error', arguments);
			})
		};

		$scope.apiTest = function(){
			api.get('season.getAll');
		}
		
	};

	LoginTestCtrl.$inject = injectParams;
	app.register.controller('LoginTestController', LoginTestCtrl);
});