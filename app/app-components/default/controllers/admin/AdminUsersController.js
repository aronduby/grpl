define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', '$stateParams', '$state', 'api', 'navApi', 'loadingOverlayApi', 'Seasons', 'Players', 'dialog'];

	var AdminUsersController = function($scope, $q, $stateParams, $state, api, navApi, loadingOverlayApi, Seasons, Players, dialog){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-users-panel');

		$scope.seasons = Seasons.all;
		$scope.users = [];
		$scope.user = null;
		$scope.replacing = {
			name_key: false
		};

		var players_promise = Players.getAllPlayers();
		players_promise.then(function(){
			$scope.users = Players.all;
		});

		if($stateParams.name_key === 'new'){
			// setup a new user
			$scope.user = {
				name_key: null,
				first_name: null,
				last_name: null,
				facebook_id: null,
				email: null,
				password: null,
				role: 1,
				seasons: [],
				active: false
			};
			navApi.setTitle('New User', 'Choose a Different User');
			$scope.new = true;
			loadingOverlayApi.hide();
		} else if($stateParams.name_key.trim() == ''){
			$scope.user = null;
			loadingOverlayApi.hide();
		} else {

			Players.getFullAndSeasons($stateParams.name_key)
			.then(function(data){
				var user_seasons = data.seasons;
				$scope.user = data.player;
				$scope.user.seasons = {};

				_.each($scope.seasons, function(season){
					$scope.user.seasons[season.season_id] = _.indexOf(user_seasons, season.season_id) >= 0;
				});

				$scope.user.active = $scope.user.seasons[Seasons.active_id];

				navApi.setTitle($scope.user.full_name, 'Choose a Different User');
			})
			.catch(function(err){
				dialog(err)
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}


		$scope.save = function(){
			loadingOverlayApi.show();

			var data = angular.copy($scope.user);
			data.seasons = [];
			_.each($scope.user.seasons, function(val, key){
				if(val)
					data.seasons.push(key);
			});

			
			
			api.post('user.register', data)
			.then(function(data){
				if(!$scope.replacing.name_key){
					saveSuccessful();
				} else {
					var replace_data = {
						replace: $scope.replacing.name_key,
						replace_with: data.name_key
					};

					api.post('user.replace', replace_data)
					.then(function(data){
						saveSuccessful();
					})
					.catch(function(err){
						err.msg += '<p>User was added but did not replace the other user</p>';
						dialog(err);
						loadingOverlayApi.hide();
					});
				}
				
			})
			.catch(function(err){
				dialog(err);
				loadingOverlayApi.hide();
			});
		}

		function saveSuccessful(){
			$state.go('admin.users', {'name_key': ''});
			dialog({
				title: 'User updated',
				headline: 'User data has been saved',
				msg: '<p>The user\'s data has been successfully saved.</p>'
			});
		}
		
	};

	AdminUsersController.$inject = injectParams;
	app.register.controller('AdminUsersController', AdminUsersController);
});