define(['js/app'], function(app){

	var injectParams = ['$scope', '$filter', '$state', '$stateParams', 'loadingOverlayApi', 'dialog', 'navApi', 'Auth', 'Scoring', 'LeagueNights', 'Players'];

	var ScoringController = function($scope, $filter, $state, $stateParams, loadingOverlayApi, dialog, navApi, Auth, Scoring, LeagueNights, Players){
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
				places = [1,2,3,4,'DNP'],
				points = [7,5,3,1,0];

			$scope.group = null;
			$scope.machine = null;

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
				_.each(group.players, function(player){
					player.score = player.machines[$scope.machine.abbv] 
						? player.machines[$scope.machine.abbv] 
						: (player.dnp ? 0 : null);
				});

				// set the proper order of the players
				var tmp = group.players.slice(0).reverse(),
					slice_index = offset > tmp.length ? offset - tmp.length : offset;
				$scope.group.players = tmp.slice(slice_index).concat(tmp.slice(0,slice_index));

				// change the points values based on DNPs
				var dnps = _.filter($scope.ties, 'dnp').length;
				switch($scope.group.players.length - dnps){
					case 4:
						break;
					case 3:
						places = [1,2,3,'DNP','DNP'];
						points = [7,4,1,0,0];
						break;
					case 2:
						places = [1,2,'DNP','DNP','DNP'];
						points = [7,1,0,0,0];
						break;
				}

				$scope.places = [];
				_.each(places, function(place, idx){
					$scope.places.push({
						place: place,
						points: points[idx]
					});
				});

				// figure out the next machine
				var macs = group.machines.slice(0),
					slice_index = offset > macs.length ? offset - macs.length : offset;
				macs = macs.slice(slice_index).concat(macs.slice(0,slice_index));
				macs.shift();

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
					taken_places = [false, false, false, false],
					dnps = _.filter($scope.group.players, 'dnp'),
					total_to_play = $scope.group.players.length - dnps.length;

				// make sure everyone has a score (DNP counts as a score here)
				if(_.filter($scope.group.players, function(p){ return p.score != undefined }).length != $scope.group.players.length ){
					scoringError('You must give everyone a place.');
					return false;
				}

				// mark any places higer than the number of people to play as DNP
				if(total_to_play < 4){
					for(var i = total_to_play; i <= 3; i++){
						taken_places[i] = true;
						error_msgs[i] = 'You only have '+total_to_play+' people, skip '+i+' place';
					}
				}

				// if we have DNPs make the lower X places as obtained
				// that way you can't have a 4th place and a DNP
				if(dnps.length > 0){
					var keys = [4,3,2,1];
					for(i=0; i<dnps.length; i++){
						taken_places[keys[i]] = true;
						error_msgs[keys[i]] = 'Your DNP player counts as '+keys[i];
					}
				}

				_.each($scope.group.players, function(player, idx){
					var val = player.score;
					// can have multiple dnps
					if(val == 0)
						return true;

					var idx = _.indexOf(points, val);

					if(taken_places[idx] === false){
						taken_places[idx] = true;
					} else {
						var msg = error_msgs[idx + 1];
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
					d.players[player.name_key] = player.score;
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