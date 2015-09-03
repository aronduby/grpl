define(['js/app'], function(app){

	var injectParams = ['$scope', '$filter', '$state', '$stateParams', '$localStorage', 'loadingOverlayApi', 'dialog', 'navApi', 'Auth', 'Seasons', 'Scoring', 'LeagueNights', 'Players'];

	var ScoringController = function($scope, $filter, $state, $stateParams, $localStorage, loadingOverlayApi, dialog, navApi, Auth, Seasons, Scoring, LeagueNights, Players){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('scoring-machine-panel');		


		if(Scoring.started === false){
			var d = dialog({
				title: 'Scoring Not Started',
				headline: 'Scoring Hasn\'t been started yet',
				msg: 'This page is only accessible when scoring has been started for a League Night. Please try again when that has happened.',
			});
			loadingOverlayApi.hide();
			d.result.finally(function(){
				$state.go('public.nights');
			});
		
		// check for admin setup - user specified, and not the user logged in, and not admin
		} else if( 
			$stateParams.name_key !== undefined 
			&& Auth.user.name_key != $stateParams.name_key
			&& !Auth.authorize('admin')
		){
			var d = dialog({
				title: 'Admins Only',
					headline: 'This page is admins only',
					msg: 'Looks like you happened upon an admin only page and you\'re not an admin. Click "OK" to head back to the homepage.',
			});
			loadingOverlayApi.hide();
			d.result.finally(function(){
				$state.go('public.nights');
			});	
		
		} else {
			var offset = ($stateParams.offset !== '' ? parseInt($stateParams.offset, 10) : 0),
				name_key = '',
				next_state = {
					state: '',
					params: {}
				},
				season = Seasons.getBySeasonId(Seasons.current_id);

			// default places
			$scope.places = {
				1: {points: 7, place: 1},
				2: {points: 5, place: 2},
				3: {points: 3, place: 3},
				4: {points: 1, place: 4},
				'DNP': {points: 0, place: 5}
			};

			$scope.group = null;
			$scope.machine = null;

			$scope.storage = $localStorage.$default({
				scoring_player_order: 'scoring_order'
			});

			// figure out what user we're using
			if($stateParams.name_key !== undefined && Auth.authorize('admin')){
				name_key = $stateParams.name_key;
				next_state.state = 'admin.scoring',
				next_state.params.name_key = $stateParams.name_key;
			} else {
				name_key = Auth.user.name_key;
				next_state.state = 'user.scoring';
			}
			next_state.params.offset = offset + 1;

			Scoring.getGroupForUser(name_key)
			.then(function(group){
				$scope.group = group;
				$scope.machines = group.machines;
				$scope.machine = group.machines[offset];

				navApi.setTitle($scope.machine.name, $scope.machine.abbv);

				// set a score parameter on player to make shit easier
				// set DNPs as 0
				var total_to_play = 0;
				_.each($scope.group.players, function(player){
					if(player.machines[$scope.machine.abbv] != null){
						player.score = player.machines[$scope.machine.abbv];
						if(player.score > 0)
							total_to_play++;
					} else {
						if(player.dnp){
							player.score = 0;
						} else {
							player.score = null;
							total_to_play++;
						}
					}
				});

				// edit the places based on the number of players
				if(total_to_play < 4){
					switch(total_to_play){
						case 3:
							$scope.places[2].points = 4;
							$scope.places[3].points = 1;
							$scope.places[4].points = undefined;
							break;
						case 2:
							$scope.places[2].points = 1;
							$scope.places[3].points = undefined;
							$scope.places[4].points = undefined;
							break;
					}
				}

				// set the place obj on the player
				_.each($scope.group.players, function(player, i){
					player.place = _.find($scope.places, {'points': player.score});
					player.group_order = i;
				});

				// set the proper order of the players
				_.each(season.scoring_order[offset], function(pidx, i){
					$scope.group.players[pidx].scoring_order = i;
				});

				$scope.next_machine = _.find(macs, function(mac){
					return group.players[0].machines[mac.abbv] == undefined;
				});
				if($scope.next_machine !== undefined){
					$scope.next_title = $scope.next_machine.abbv;
				} else {
					$scope.next_title = 'Save and Exit';
				}
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();	
			});

			$scope.createState = function(offset){
				var state = angular.copy(next_state);
				state.params.offset = offset;
				return state.state+'('+$filter('json')(state.params)+')';
			};

			function scoringError(message){
				dialog({
					title: 'Oops...',
					headline: 'Looks like there\'s an error',
					msg: message,
					additional_classes: 'scoring_error error'
				});
				loadingOverlayApi.hide();
			};

			$scope.save = function(){
				loadingOverlayApi.show();
				$scope.confirmed = false;

				var errors = [],
					error_msgs = {
						1: 'You have multiple people marked as 1st',
						2: 'You have multiple people marked as 2nd',
						3: 'You have multiple people marked as 3rd',
						4: 'You have multiple people marked as 4th',
					},
					taken_places = [null, false, false, false, false];

				// make sure everyone has a score (DNP counts as a score here)
				if(_.filter($scope.group.players, function(p){ return p.place != undefined }).length != $scope.group.players.length ){
					scoringError('You must give everyone a place.');
					return false;
				}

				var dnps = _.filter($scope.group.players, function(p){ return p.place.points === 0});

				// mark any places higer than the number of people to play as DNP
				// rework the points as well
				if(dnps.length > 0){
					var total_to_play = $scope.group.players.length - dnps.length;
					for(var i = total_to_play; i <= 3; i++){
						taken_places[i + 1] = true;
						error_msgs[(i + 1)] = 'Only '+total_to_play+' people played, skip '+(i + 1)+' place';
					}

					switch(total_to_play){
						case 3:
							$scope.places[2].points = 4;
							$scope.places[3].points = 1;
							$scope.places[4].points = 0;
							break;
						case 2:
							$scope.places[2].points = 1;
							$scope.places[3].points = 0;
							$scope.places[4].points = 0;
							break;
					}
				}

				_.each($scope.group.players, function(player, idx){
					var val = player.place.place;
					// can have multiple dnps
					if(val == 5)
						return true;

					if(taken_places[val] === false){
						taken_places[val] = true;
					} else {
						var msg = error_msgs[val];
						if(errors.indexOf(msg) == -1)
							errors.push(msg);
					}
				});

				if(errors.length){
					scoringError('<ul><li>'+errors.join('</li><li>')+'</li></ul>');
					return false;
				}


				// everything is good, format and send the data
				var d = {
					starts: Scoring.night.starts,
					abbv: $scope.machine.abbv,
					players: {}
				};
				
				_.each($scope.group.players, function(player){
					d.players[player.name_key] = player.place.points;
				});

				Scoring.submit(d)
				.then(function(){
					if($scope.next_machine == undefined){
						$state.go('public.nights');
					} else {
						$state.go(next_state.state, next_state.params);
					}
				})
				.catch(function(err){
					dialog(err);
					loadingOverlayApi.hide();
				});
			}
			
		}
		
	};

	ScoringController.$inject = injectParams;
	app.register.controller('ScoringController', ScoringController);
});