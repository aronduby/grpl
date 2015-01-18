define(['js/app'], function(app){

	app.controller('FooterController', ['$scope', '$window', 'api', 'ipCookie', function($scope, $window, api, ipCookie) {
		$scope.seasons = [];
		$scope.cur_season = null;

		var season_id = ipCookie('season_id');

		api.get('seasons.getAll')
			.then(function(seasons){
				$scope.seasons = seasons;
				$scope.cur_season = _.find(seasons, {'season_id': season_id});
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