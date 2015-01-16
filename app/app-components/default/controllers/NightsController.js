define(['js/app', 'app-components/controllers/RandomizerController'], function(app, RandomizerController){

	var injectParams = ['$stateParams', '$scope', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare', 'LeagueNights', '$filter', '$modal', 'Machines'];

	var NightsController = function($stateParams, $scope, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare, LeagueNights, $filter, $modal, Machines){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('nights-panel');		

		$scope.user = Auth.user;
		$scope.params = $stateParams;
		$scope.nights = [];
		$scope.night = {};

		var all_nights_promise, this_nights_promise;

		LeagueNights.loading
			.then(function(nights){
				$scope.nights = LeagueNights.nights;

				if($stateParams.starts === ''){
					$scope.night = LeagueNights.getNextNight();
				} else {
					$scope.night = LeagueNights.getNight($stateParams.starts);
				}

				if($scope.night === undefined)
					$scope.night = LeagueNights.getTotals();

				navApi.setTitle($scope.night.title, $scope.night.description);
			})
			.finally(function(){
				
				LeagueNights.getFullNight($scope.night.starts)
					.then(function(night){
						$scope.night = night;

						// underscore chaining FTW!
						var players = _.chain(night.divisions)
							.map(function(obj){ return obj.player_list.players })
							.flatten()
							.value();

						var ties = _.chain(players)
							.groupBy('scoring_string')
							.filter(function(arr){ return arr.length > 1; })
							.value();

						if(ties.length > 0 && (ties.length != 1 && ties[0].length != players.length)){
							_.each(ties, function(group, tie_index){
								_.each(group, function(player){
									player.tied = true;
									player.tied_index = tie_index;
								})
							});
						}
					})
					.finally(function(){
						loadingOverlayApi.hide();
					});
			});


		// not 100% sure why this works, but its from https://github.com/a8m/angular-filter/issues/57
		$scope.properGroupOrder = function(arr) {
			return $filter('min')
				($filter('map')(arr, 'grouping'));
		}
		
		// eventually make it's own thing
		$scope.randomizer = function randomizer(){

			var modalInstance = $modal.open({
				templateUrl: 'app-components/partials/randomizer.html',
				controller: RandomizerController,
				resolve: {
					Machines: function(){ return Machines; }
				}
			});
		}
		
	};

	NightsController.$inject = injectParams;
	app.register.controller('NightsController', NightsController);
});