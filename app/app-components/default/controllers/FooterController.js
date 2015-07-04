define(['js/app'], function(app){

	app.controller('FooterController', ['$scope', '$window', 'api', 'ipCookie', 'Seasons', 'Push', function($scope, $window, api, ipCookie, Seasons, Push) {
		$scope.seasons = [];
		$scope.cur_season = null;
		$scope.season = Seasons;
		$scope.push = Push;

		var season_id = ipCookie('season_id');

		Seasons.loading
		.then(function(seasons){
			$scope.seasons = Seasons.all;
			$scope.cur_season = _.find(Seasons.all, {'season_id': season_id});
		});

		$scope.changeSeason = function changeSeason(season){
			ipCookie('season_id', season.season_id);
			api.get('changeSeason', season.season_id)
			.then(function(){
				console.log('changed', arguments);
				$window.location.reload();
			})
			.catch(function(err){
				console.error(err);
			})
			.finally(function(){
				console.log('finally');
			});
		}
	}])

	return app;
});