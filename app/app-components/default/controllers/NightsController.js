define(['js/app'], function(app){

	var injectParams = ['$stateParams', '$scope', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare'];

	var NightsController = function($stateParams, $scope, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('nights-panel');
		

		$scope.user = Auth.user;
		$scope.params = $stateParams;
		$scope.nights = [];
		api.get('leaguenight')
		.then(function(nights){
			$scope.nights = nights;
		})
		.finally(function(){
			loadingOverlayApi.hide();
		});
		
		
		if($stateParams.starts === ''){
			$stateParams.starts = 'totals';
		}
		

		$scope.randomizer = function randomizer(){
			var quotes = [
				"<blockquote><p>Patience is not simply the ability to wait - it's how we behave while we're waiting.</p><cite>Joyce Meyer</cite></blockquote>",
				"<blockquote><p>Patience is bitter, but its fruit is sweet.</p><cite>Jean-Jacques Rousseau</cite></blockquote>",
				"<blockquote><p>Sometimes things aren't clear right away. That's where you need to be patient and persevere and see where things lead.</p><cite>Mary Pierce</cite></blockquote>",
				"<blockquote><p>There is something good in all seeming failures. You are not to see that now. Time will reveal it. Be patient.</p><cite>Swami Sivananda</cite></blockquote>"
			];
			flare.info(quotes[Math.floor(Math.random()*quotes.length)]);
		}
		
	};

	NightsController.$inject = injectParams;
	app.register.controller('NightsController', NightsController);
});