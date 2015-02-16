define(['js/app'], function(app){

	var injectParams = ['$scope', 'socket', '$timeout'];

	var SocketStatusCtrl = function($scope, socket, $timeout){
		$scope.status = false;
		$scope.msg = false;
		$scope.current_attempt = 0;
		$scope.reconnection_attempts = 5; // match socket setting in services
		$scope.spin_options = {
			lines: 7,
			length: 2,
			width: 4,
			radius: 4,
			corners: .9,
			color: '#fff'
		};

		socket
			.on('disconnect', function(){
				$scope.status = 'reconnecting';
				$scope.msg = 'You\'ve gotten disconnected, we\'re attempting to reconnect you';
			})
			.on('reconnect', function(type, attempt_number){
				$scope.status = 'reconnected';
				$scope.msg = 'Reconected, but we\'re grabbing fresh data to make sure your up to date';
				$scope.attempt_number = 0;
				$timeout(function(){
					$scope.status = false;
					$scope.msg = false;
				}, 5000);
			})
			.on('reconnecting', function(delay, attempt_number){
				$scope.current_attempt = attempt_number;
			})
			.on('reconnect_failed', function(){
				$scope.status = 'disconnected';
				$scope.msg = 'Reconnection failed! This data will be out of date. Please refresh the page to try again';
			});
	};

	SocketStatusCtrl.$inject = injectParams;
	app.controller('SocketStatusCtrl', SocketStatusCtrl);
		
	return app;
});