define(['js/app'], function(app){

	app.controller('NavController', [
	'$scope', '$state', '$modal', 'Auth', 'loadingOverlayApi', 'adminMenu', 'navApi', 'inlineModalApi', 'Scoring', 'socket', 'dialog', 
	function($scope, $state, $modal, Auth, loadingOverlayApi, adminMenu, navApi, inlineModalApi, Scoring, socket, dialog) {

		$scope.api = navApi;
		$scope.scoring_started = false;

		$scope.toggleAdminMenu = function(){
			adminMenu.toggle();
		};

		$scope.toggleCenterPanel = function(){
			if(navApi.center_panel_key)
				inlineModalApi.open( navApi.center_panel_key );
		};

		$scope.login =function(){
			// open login modal
			loadingOverlayApi.show();
			require(['app-components/controllers/LoginController'], function(LoginController) {
				// $rootScope.$apply();
				loadingOverlayApi.hide();
				$modal.open({
					templateUrl: 'app-components/partials/login.html',
					controller: LoginController,
					resolve: {
						Auth: function(){ return Auth; },
						loadingOverlayApi: function(){ return loadingOverlayApi; },
						dialog: function(){ return dialog }
					}
				});
			});
		};

		$scope.scoringLogin = function(){
			loadingOverlayApi.show();

			Scoring.login()
			.then(function(){
				$state.go('user.scoring');
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			})
		};


		$scope.$watchGroup(['api.title', 'api.subtitle'], function(newValues, oldValues, scope){
			$scope.title = newValues[0];
			$scope.subtitle = newValues[1];
		});

		function scoringStarted(){ 
			$scope.scoring_started = true; 
		};
		function scoringStopped(){ 
			$scope.scoring_started = false; 
		};

		socket
			.on('scoring_started', scoringStarted)
			.on('scoring_stopped', scoringStopped);


		
	}])

	return app;
});