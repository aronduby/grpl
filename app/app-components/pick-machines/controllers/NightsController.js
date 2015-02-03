define(['js/app', 'app-components/controllers/RandomizerController'], function(app, RandomizerController){

	var injectParams = ['$stateParams', '$scope', 'Auth', 'navApi', 'api', 'promiseTracker', 'dialog', 'loadingOverlayApi', 'flare', 'LeagueNights', '$filter', '$modal', 'Machines', 'Scoring', 'socket'];

	var NightsController = function($stateParams, $scope, Auth, navApi, api, promiseTracker, dialog, loadingOverlayApi, flare, LeagueNights, $filter, $modal, Machines, Scoring, socket){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('nights-panel');

		$scope.user = Auth.user;
		$scope.params = $stateParams;
		$scope.nights = [];
		$scope.night = {};
		$scope.live = false;
		$scope.scoring = Scoring;

		var all_nights_promise, this_nights_promise;

		LeagueNights.loading
		.then(function(nights){
			$scope.nights = LeagueNights.nights;

			if($stateParams.starts === ''){
				$scope.night = LeagueNights.getNextNight(true);
			} else {
				$scope.night = LeagueNights.getNight($stateParams.starts);
			}

			if($scope.night === undefined)
				$scope.night = LeagueNights.getTotals();

			navApi.setTitle($scope.night.title, $scope.night.description);
		})
		.finally(function(){

			loadNight($scope.night.starts);
			
		});


		function loadNight(starts){
			LeagueNights.getFullNight(starts)
			.then(function(night){
				$scope.night = night;

				$scope.live = Scoring.started && $scope.night.starts == Scoring.night.starts;
				if($scope.live){
					$scope.night = Scoring.night;
				}

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
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}




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


		/*
		 *	Socket Events
		*/		
		function tiesBroken(data){
			if($scope.night.night_id == data.night_id){
				var players = _.flatten(_.pluck(_.pluck($scope.night.divisions, 'player_list'),'players'));

				_.each(data.players, function(p){
					var player = _.find(players, {'name_key': p.name_key}),
						ss = player.scoring_string;

					// replace the tie-breaker portion of scoring string
					ss = ss.split('.');
					ss[6] = p.place;
					player.scoring_string = ss.join('.');

					// update the group and order
					player.grouping = p.grouping;
					player.start_order = p.start_order;

					// remove the tied class
					player.tied = false;
				});
			}
		};

		function scoringStarted(data){
			$scope.live = $scope.night.starts == Scoring.night.starts;
			if($scope.live){
				$scope.night = Scoring.night;
			}
		};

		function scoringStopped(){
			$scope.live = false;
		};

		function leaguenightUpdated(data){
			if($scope.night.night_id == data.night_id){
				// copy over the relevant fields
				$scope.night.description = data.description;
				$scope.night.future = data.future;
				$scope.night.has_order = data.has_order;
				$scope.night.moment = data.moment;
				$scope.night.note = data.note;
				$scope.night.starts = data.starts;
				$scope.night.title = data.title;
				$scope.night.today = data.today;
				$scope.night.totals = data.totals;
				
				navApi.setTitle($scope.night.title, $scope.night.description);

				flare.info('<h1>Heads Up</h1><p>The night you are viewing has been updated, so if it looks like something changed, it\'s because it did.</p>', 5000);
			}
		};

		function leaguenightOrderUpdated(data){
			if($scope.night.night_id == data.night_id){
				loadNight(data.starts);
				flare.warn('<h1>Order Changed</h1><p>The order for the night has changed, so we\'re grabbing you the proper information.</p>', 5000);
			}
		};

		function userUpdated(data){
			var players = _.chain($scope.night.divisions)
				.pluck('player_list')
				.pluck('players')
				.flatten()
				.value();

			var player = _.find(players, {'player_id': data.player_id});
			if(player != undefined){
				player.first_name = data.first_name;
				player.full_name = data.full_name;
				player.initials = data.initials;
				player.last_name = data.last_name;
			}
		}

		function machineUpdated(data){
			var machines = _.chain($scope.night.divisions)
				.pluck('machines')
				.flatten()
				.value();

			var machine = _.find(machines, {'machine_id': data.machine_id});
			if(machine != undefined){
				machine.abbv = data.abbv;
				machine.image = data.image;
				machine.name = data.name;
				machine.note = data.note;
				machine.url = data.url;
			}
		};


		socket.addScope($scope.$id)
			.on('tiesbroken', tiesBroken)
			.on('scoring_started', scoringStarted)
			.on('scoring_stopped', scoringStopped)
			.on('leaguenight_updated', leaguenightUpdated)
			.on('leaguenight_order_updated', leaguenightOrderUpdated)
			.on('user_updated', userUpdated)
			.on('machine_updated', machineUpdated);

		$scope.$on("$destroy", function() {
			socket.getScope($scope.$id).clear();
		});	
		
	};

	NightsController.$inject = injectParams;
	app.register.controller('NightsController', NightsController);
});