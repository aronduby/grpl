define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', '$state', '$stateParams', 'loadingOverlayApi', 'navApi', 'adminMenu', 'api', 'dialog', 'LeagueNights', 'Players'];

	var AdminTiebreakerController = function($scope, $q, $state, $stateParams, loadingOverlayApi, navApi, adminMenu, api, dialog, LeagueNights, Players){
		loadingOverlayApi.show();
		navApi.defaultTitle();

		// find the night to break ties
		var next = 	LeagueNights.getNextOrMostRecentNight(true);
		$scope.ties = null;
		$scope.places = [];

		if(next == undefined){
			loadingOverlayApi.hide();
			var inst = dialog({
				title: 'Cant\'t Break Ties',
				headline: 'No Usable League Night Found to Break Ties',
				msg: 'You have to have an upcoming night to be able to break ties. Enter one into the system before trying to do this again.',
			});
			inst.finally(function(){
				$state.go('public.nights');
			});
		
		} else {

			api.get('leaguenight.ties', next.starts)
			.then(function(ties){
				$scope.ties = _.find(ties, function(group){
					return !!_.find(group, {'name_key': $stateParams.name_key});
				});

				if($scope.ties != undefined){
					for(var i=1; i<=$scope.ties.length; i++)
						$scope.places.push(i);	
				} else {
					// basic content message will show
					// open the admin menu as well to pick another tie
					adminMenu.open();
				}
				
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}

		$scope.save = function(){
			loadingOverlayApi.show();
			$scope.confirmed = false;

			var errors = [];

			// make sure everyone has a score
			if(_.filter($scope.ties, 'place').length != $scope.ties.length){
				errors.push('You must give everyone a place');
			
			// make sure they have different values
			} else if(_.uniq(_.pluck($scope.ties, 'place')).length != $scope.ties.length){
				errors.push('You have some repeated places.');
			}

			if(errors.length > 0){
				loadingOverlayApi.hide();
				dialog({
					title:'Scoring Error',
					headline: 'You have the following error(s):',
					msg: '<ul><li>'+errors.join('</li><li>')+'</li></ul>'
				});
			} else {

				var data = {
					starts: next.starts,
					night_id: next.night_id,
					name_key: $scope.ties[0].name_key,
					players: []
				};

				_.each($scope.ties, function(player){
					data.players.push({
						name_key: player.name_key,
						place: player.place
					});
				});

				api.post('tiebreaker', data)
				.then(function(){
					// something better
					$state.go('admin.tiebreaker', {'name_key': ''});
				})
				.catch(function(err){
					dialog(err);
					loadingOverlayApi.hide();
				});
			}
			
			
		}
		
	};

	AdminTiebreakerController.$inject = injectParams;
	app.register.controller('AdminTiebreakerController', AdminTiebreakerController);
});