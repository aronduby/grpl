define([], function(){

	// var injectParams = ['$scope', '$modalInstance', 'User'];

	var MessageInABottleController = function($scope, $modalInstance, User){

		$scope.user = User;
		$scope.jokes = [
			'<h2>No, wait! Mouth! That should have been mouth, it\'s funnier that way. I\'ve never had a garbanzo bean in my mouth!</h2>',
			'<h2>What\'s the difference between your job and a dead prostitute?</h2><p>Your job still sucks!</p>',
			'<h2>What\'s red and smells like blue paint?</h2><p>Red paint</p>',
			'<h2>Whats long and hard and has cum in it?</h2><p>A cucumber</p>',
			'<h2>What do you call two jalape&ntilde;os getting it on?</h2><p>Fucking hot!</p>',
			'<h2>What\'s green and has wheels?</h2><p>Grass. I lied about the wheels</p>',
			'<h2>What did the cannibal do after he dumped his girlfriend?</h2><p>Wiped his ass</p>'
		];

		var i = 0;
		$scope.joke = $scope.jokes[i];

		$scope.next = function(){
			i++;
			if(i >= $scope.jokes.length){
				i = 0;
			}
			$scope.joke = $scope.jokes[i];
		};


		$scope.close = function(){
			$modalInstance.close();
		};
	};

	// Modal Controller just needs to be a function
	// MessageInABottleController.$inject = injectParams;
	// app.controller('MessageInABottleController', MessageInABottleController);

	return MessageInABottleController;
});