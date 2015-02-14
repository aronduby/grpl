define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', '$stateParams', '$state', 'api', 'navApi', 'loadingOverlayApi', 'Seasons', 'Players', 'dialog'];

	var AdminSeasonsController = function($scope, $q, $stateParams, $state, api, navApi, loadingOverlayApi, Seasons, Players, dialog){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-seasons-panel');

		$scope.seasons = Seasons;
		$scope.divisions = [];
		$scope.season = null;

		$scope.players = [
			{idx:0, title:'Player 1'},
			{idx:1, title:'Player 2'},
			{idx:2, title:'Player 3'},
			{idx:3, title:'Player 4'}
		];
		$scope.scoring_order = [[],[],[],[],[]];

		if($stateParams.season_id === 'new'){
			// setup a new user
			$scope.season = {
				season_id: null,
				title: null,
				current: false
			};

			navApi.setTitle('New Season', 'Choose a Different Season');
			loadingOverlayApi.hide();

		} else if($stateParams.season_id.trim() == ''){
			$scope.season = null;
			loadingOverlayApi.hide();

		} else {
			var id = parseInt($stateParams.season_id, 10);
			$scope.season = Seasons.getBySeasonId(id);
			$scope.season.current = ($scope.season.season_id == Seasons.current_id);
			if($scope.season.scoring_order){
				$scope.scoring_order = $scope.season.scoring_order;
			}

			api.get('division.getForSeasonNoPlayers', id)
			.then(function(data){
				$scope.divisions = data;
				navApi.setTitle($scope.season.title, 'Choose a Different Season');
			})
			.catch(function(err){
				dialog(err)
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}

		$scope.addDivision = function addDivision(){
			$scope.divisions.push({title: null, cap:null});
		};

		$scope.removeDivision = function removeDivision(idx){
			$scope.divisions.splice(idx,1);
		};


		$scope.save = function(){
			loadingOverlayApi.show();

			if($scope.divisions.length < 1){
				loadingOverlayApi.hide();
				dialog({
					title: 'Oops...',
					headline: 'Add a Division',
					msg: 'You have to have at least 1 division per season for things to work',
				});
			} else {
				var data = angular.copy($scope.season);

				_.each($scope.divisions, function(div, idx){
					div.season_id = $scope.season.season_id;
					div.display_order = idx;
				});

				data.divisions = $scope.divisions;
				data.scoring_order = $scope.scoring_order;

				api.post('season.update', data)
				.then(function(d){
					$state.go('admin.seasons', {'season_id': ''});
					dialog({
						title: 'Season Updated',
						headline: 'Season data has been saved',
						msg: '<p>The season\'s data has been successfully saved.</p>'
					});	
				})
				.catch(function(err){
					dialog(err);
				})
				.finally(function(){
					loadingOverlayApi.hide();
				});
			}
		}
		
	};

	AdminSeasonsController.$inject = injectParams;
	app.register.controller('AdminSeasonsController', AdminSeasonsController);
});