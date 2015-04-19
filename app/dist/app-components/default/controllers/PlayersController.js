define(['js/app'], function(app){

	var injectParams = ['$stateParams', '$scope', '$q', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare', 'LeagueNights', '$filter', 'Machines', 'Players', 'googleChartApiPromise', 'socket' ];

	var PlayersController = function($stateParams, $scope, $q, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare, LeagueNights, $filter, Machines, Players, googleChartApiPromise, socket ){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('players-panel');

		var all_loaded, player_loaded, head_to_head_loaded, head_to_head_all_time_loaded;

		$scope.user = Auth.user;
		$scope.name_key = $stateParams.name_key;
		
		$scope.players = [];
		$scope.player = {};
		$scope.player_data = {};
		
		$scope.chart = {
			type: 'LineChart',
			options: {
				title: 'Points/Place per League Night',
				titleTextStyle: {
					fontName: 'Roboto Condensed',
					fontSize: 16,
					color: '#8b8b8b',
					bold: true
				},
				height: 300,
				titlePosition: 'none',
				fontName: 'Roboto Condensed',
				chartArea: {
					top: '5%',
					left: '5%',
					width: '90%',
					height: '90%'
				},
				axisTitlesPosition: 'none',
				annotations: {
					textStyle: {
						color: '#8b8b8b'   
					}
				},
				backgroundColor: 'transparent',
				lineWidth: 4,
				pointSize: 8,
				legend: {
					position: 'none'  
				},
				// Gives each series an axis that matches the vAxes number below.
				series: {
					0: { 
						targetAxisIndex: 0,
						color: '#699db1'
					},
					1: { 
						targetAxisIndex: 1,
						color: '#d3c9a9'
					},
					2: { 
						targetAxisIndex: 0,
						color: '#8db27b'
					}
				},
				vAxes: {
					// Adds titles to each axis
					0: {
						title: 'Points',
						viewWindow: {
							min: -1,
							max: 36
						},
						ticks: [5, 15, 25, 35]
					},
					1: {
						title: 'Place', 
						direction: -1,
						viewWindow: {
							min: 0,
							max: 53
						},
						gridlines: {
							color: 'transparent'  
						},
						ticks: [1, 15, 30, 45]
					}
				},
				hAxis: {
					gridlines: {
						color: 'transparent'
					},
					viewWindowMode: 'pretty',
					baselineColor: 'transparent',
					textPosition: 'none'
				},
				vAxis: {
					baselineColor: 'transparent'
				}
			}
		};

		$scope.machine_bar_multiplier = 1;

		$scope.compare_to = null;
		$scope.compare_machines = null;
		
		$scope.head_to_head = [];
		$scope.head_to_head_all_time = [];
		$scope.head_to_head_tracker = promiseTracker();
		$scope.head_to_head_all_time_tracker = promiseTracker();


		all_loaded = Players.loading
		.then(function(players){
			$scope.players = Players.players;
		});


		function playerFullSeason(player_data){
			$scope.player_data = player_data;
			$scope.player = player_data.player;
			$scope.machine_bar_multiplier = calcMachineBarMultiplier(player_data.machines);
			$scope.machine_picks = _.chain(player_data.machine_picks).each(function(obj){ obj.picked_on = moment(obj.picked_on) }).groupBy('abbv').value();

			navApi.setTitle($scope.player.first_name+' '+$scope.player.last_name, 'View a Different Player');

			player_data.nights.reverse();
		}
		player_loaded = Players.getFullForSeason($scope.name_key).then(playerFullSeason);


		// google loaded set everything up
		function drawChart(){
			$scope.chart.data = new google.visualization.DataTable();
			$scope.chart.data.addColumn('date', 'Night');
			$scope.chart.data.addColumn('number', "Points");
			$scope.chart.data.addColumn({type:'string', role:'annotation'});
			$scope.chart.data.addColumn('number', "Place");
			$scope.chart.data.addColumn({type:'string', role:'annotation'});
			$scope.chart.data.addColumn('number', 'Sub Points');

			_.each($scope.player_data.nights, function(night, i){
				// figure out the place we ended up in at the end of the night
				var end_place = 0;
				if($scope.player_data.nights[i + 1] === undefined){
					end_place = $scope.player_data.places.totals;
				} else {
					end_place = $scope.player_data.places[$scope.player_data.nights[i + 1].starts];
				}

				var sub = null;
				if(night.sub != null){
					sub = night.points;
				}

				$scope.chart.data.addRow([new Date(night.starts), night.points, ''+night.points, end_place, ''+end_place, sub]);
			});
		}
		$q.all([googleChartApiPromise, player_loaded]).then(drawChart);


		function calcMachineBarMultiplier(machines){
			return _.chain(machines).groupBy('abbv').max(function(m){ return m.length; }).value().length;
		};


		// machines compare to
		function compareTo(player, surpress_loading){
			if(player !== null){
				if(!surpress_loading)
					loadingOverlayApi.show();

				Players.getFullForSeason(player.name_key)
					.then(function(data){

						// filter out machines which the scoped player hasn't played
						var compare_abbvs = _.pluck($scope.player_data.machines, 'abbv');
						$scope.compare_machines = _.chain(data.machines)
							.filter(function(machine){
								return _.contains(compare_abbvs, machine.abbv);
							})
							.tap(function(macs){
								$scope.machine_bar_multiplier = Math.max(calcMachineBarMultiplier(macs), calcMachineBarMultiplier($scope.player_data.machines));		
							})
							.groupBy('abbv')
							.value();

					})
					.finally(function(){
						if(!surpress_loading)
							loadingOverlayApi.hide();
					})
			} else {
				$scope.compare_machines = null;
				$scope.machine_bar_multiplier = calcMachineBarMultiplier($scope.player_data.machines);
			}
		}
		$scope.$watch('compare_to', function(player){
			compareTo(player, false);
		});
		


		// hide the overlay once everyone and the full player is loaded
		// head to head takes longer and can wait (I think it takes longer, not sure I tested that ever)
		$q.all([all_loaded, player_loaded])
		.then(function(){
			loadingOverlayApi.hide();
		});


		function reformatHeadToHeadData(data){
			var new_data = [],
				player = data.players[$scope.name_key];

			delete data.players[$scope.name_key];

			_.each(data.players, function(opponent){
				var o = {
					first_name: opponent.first_name,
					last_name: opponent.last_name,
					games: [],
					wins: 0,
					losses: 0
				};

				_.each(opponent.machines, function(nights, abbv){
					_.each(nights, function(score, starts){
						var starts_str = starts.match(/(\d{4})-0?(\d{1,2})-0?(\d{1,2})/);
						starts_str = starts_str[2]+'/'+starts_str[3]+'/'+starts_str[1];

						var game = {
							'abbv': abbv,
							'title': data.machines[abbv],
							'starts': starts_str,
							'player': player.machines[abbv][starts],
							'opponent': score,
							'won': player.machines[abbv][starts] > score,
							'starts_ts': new Date(starts).getTime()
						}
						o.games.push(game);
					});
				});

				o.wins = _.reduce(o.games, function(memo, game){ return memo + (game.won ? 1 : 0); }, 0);
				o.losses = o.games.length - o.wins;

				new_data.push(o);
			});

			return new_data;
		}

		function loadHeadToHead(){
			head_to_head_loaded = Players.getHeadToHead($scope.name_key)
			.then(function(data){
				$scope.head_to_head = reformatHeadToHeadData(data);
			});
			$scope.head_to_head_tracker.addPromise(head_to_head_loaded);

			head_to_head_all_time_loaded = Players.getHeadToHeadAllTime($scope.name_key)
			.then(function(data){
				$scope.head_to_head_all_time = reformatHeadToHeadData(data);
			});
			$scope.head_to_head_all_time_tracker.addPromise(head_to_head_all_time_loaded);	
		}
		loadHeadToHead();



		function scoresEdited(data){
			var edited_players = _.chain(data.scores).pluck('name_key').uniq().value();

			// if this player was edited, then we have to reload everything
			if(_.indexOf(edited_players, $scope.player.name_key) >= 0){
				flare.warn('<h1>Scores Edited</h1><p>'+$scope.player.first_name+'\'s scores have been edited, we\'re updating everything for you.</p>', 5000);				
				loadingOverlayApi.show();
				var player_loaded = Players.getFullForSeason($scope.name_key).then(playerFullSeason);
				$q.all([googleChartApiPromise, player_loaded]).then(function(){
					drawChart();
					loadHeadToHead();
					loadingOverlayApi.hide();
				});

			// if the player being compared to in points per machine, then reload that
			} else if($scope.compare_to != null && _.indexOf(edited_players, $scope.compare_to.name_key) >= 0){
				compareTo($scope.compare_to, true);
				flare.warn('<h1>Scores Edited</h1><p>'+$scope.compare_to.first_name+'\'s scores have been edited, we\'re updating the points per machine comparison for you.</p>', 5000);

			// otherwise just reload the head to head data	
			} else {
				loadHeadToHead();
				flare.warn('<h1>Scores Edited</h1><p>Scores have been edited, we\'re updating the head to head for you.</p>', 5000);
			}			
		};

		socket.addScope($scope.$id)
			.on('scores_edited', scoresEdited);

		$scope.$on("$destroy", function() {
			socket.getScope($scope.$id).clear();
		});	
		
	};

	PlayersController.$inject = injectParams;
	app.register.controller('PlayersController', PlayersController);

});