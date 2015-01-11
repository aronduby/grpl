define(['js/app'], function(app){
	
	app.controller('NavCtrl', ['$rootScope', '$scope', '$state', 'Auth', 'flare', '$document', function($rootScope, $scope, $state, Auth, flare, $document) {
		$scope.user = Auth.user;
		$scope.userRoles = Auth.userRoles;
		$scope.accessLevels = Auth.accessLevels;
		$scope.navbar_open = false;

		$scope.logout = function() {
			Auth.logout()
			.then(
				function(){
					$scope.user = Auth.user;
					$state.go('anon.login');
				}, function(err){
					console.log(err);
					flare.error("Failed to logout: "+err.msg);
				}
			);
		};

		$scope.toggleMainMenu = function(){
			$scope.navbar_open = false;
			angular.element(document.body).toggleClass('mmc mme');
		}

		/*
		// clicks to links in main menu and navbar close the respective menus
		// not great but whatever
		$(document).on('click', '#main-menu a', function(){
			$('body').toggleClass('mme');	
		});

		$('#main-navbar').on('click', 'a:not(.dropdown-toggle)', function(){
			$scope.navbar_open = false;
		});
		*/
	}])

	return app;
});