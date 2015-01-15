define(['js/app'], function(app){

	var injectParams = ['$stateParams', '$scope', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare', 'LeagueNights', '$filter'];

	var NightsController = function($stateParams, $scope, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare, LeagueNights, $filter){
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
					$scope.night = LeaugeNights.getTotals();

				navApi.setTitle($scope.night.title, $scope.night.description);
			})
			.finally(function(){
				
				LeagueNights.getFullNight($scope.night.starts)
					.then(function(night){
						$scope.night = night;
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
			var quotes = [
				"<blockquote><p>Patience is not simply the ability to wait - it's how we behave while we're waiting.</p><cite>Joyce Meyer</cite></blockquote>",
				"<blockquote><p>Patience is bitter, but its fruit is sweet.</p><cite>Jean-Jacques Rousseau</cite></blockquote>",
				"<blockquote><p>Sometimes things aren't clear right away. That's where you need to be patient and persevere and see where things lead.</p><cite>Mary Pierce</cite></blockquote>",
				"<blockquote><p>There is something good in all seeming failures. You are not to see that now. Time will reveal it. Be patient.</p><cite>Swami Sivananda</cite></blockquote>"
			];
			flare.info(quotes[Math.floor(Math.random()*quotes.length)], 3000);
		}
		
	};

	NightsController.$inject = injectParams;
	app.register.controller('NightsController', NightsController);
});