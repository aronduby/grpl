define(['js/app'], function(app){

	var injectParams = ['$stateParams', '$scope', '$q', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare', 'LeagueNights', '$filter', 'Machines', 'Players'];

	var PlayersController = function($stateParams, $scope, $q, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare, LeagueNights, $filter, Machines, Players){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('players-panel');

		var all_loaded, player_loaded, head_to_head_loaded, head_to_head_all_time_loaded;

		$scope.user = Auth.user;
		$scope.name_key = $stateParams.name_key;
		
		$scope.players = [];
		$scope.player = {};
		$scope.player_data = {};
		
		$scope.chart_data = {};
		$scope.chart_options = {};
		$scope.chart_show_points = true;
		$scope.chart_show_places = true;
		$scope.chart_control = {};

		$scope.machine_bar_multiplier = 1;

		$scope.compare_to = null;
		$scope.compare_machines = null;

		$scope.machine_picks = [];
		
		$scope.head_to_head = [];
		$scope.head_to_head_all_time = [];
		$scope.head_to_head_tracker = promiseTracker();
		$scope.head_to_head_all_time_tracker = promiseTracker();


		all_loaded = Players.loading
		.then(function(players){
			$scope.players = Players.players;
		});

		player_loaded = Players.getFullForSeason($scope.name_key)
		.then(function(player_data){
			$scope.player_data = player_data;
			$scope.player = player_data.player;
			$scope.machine_bar_multiplier = calcMachineBarMultiplier(player_data.machines);
			$scope.machine_picks = _.groupBy(player_data.machine_picks, 'abbv');

			navApi.setTitle($scope.player.first_name+' '+$scope.player.last_name, 'View a Different Player');

			// create our chart data
			var chart_data = {
					points: [],
					sub: [],
					places: []
				},
				j = 1;

			player_data.nights.reverse();

			_.each(player_data.nights, function(night, i){
				chart_data.points.push([j, night.points]);
				
				// figure out the place we ended up in at the end of the night
				var end_place = 0;
				if(player_data.nights[j] === undefined){
					end_place = player_data.places.totals;
				} else {
					end_place = player_data.places[player_data.nights[j].starts];
				}
				chart_data.places.push([j, end_place]);


				// if there's a sub for this week treat it as a part of the second series
				if(night.sub != null)
					chart_data.sub.push([j, night.points]);
				j++;
			});
			$scope.chart_data = [chart_data.places, chart_data.points, chart_data.sub];
		});

		function calcMachineBarMultiplier(machines){
			return _.chain(machines).groupBy('abbv').max(function(m){ return m.length; }).value().length;
		};


		// machines compare to
		$scope.$watch('compare_to', function(player){
			if(player !== null){
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
						loadingOverlayApi.hide();
					})
			} else {
				$scope.compare_machines = null;
				$scope.machine_bar_multiplier = calcMachineBarMultiplier($scope.player_data.machines);
			}
		});


		$scope.$watch('chart_show_places', function(val){
			$scope.chart_options.series[0].show = val;
		});

		$scope.$watch('chart_show_points', function(val){
			$scope.chart_options.series[1].show = $scope.chart_options.series[2].show = val;
			$scope.chart_options.axes.y2axis.tickOptions.showGridline = !val;
		});

		$scope.nightsCollapsed = function(closed){
			if(closed === false){
				// $scope.chart_control.redraw();
			}			
		};
		


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



		$scope.chart_options = {
			title: {
				text: 'POINTS/PLACE PER LEAGUE NIGHT',
				fontFamily: 'Roboto Condensed',
				fontWeight: 'bold',
				textColor: '#515151'
			},
			seriesDefaults: {
				pointLabels: { 
					show: true 
				}
			},
			series:[
				// series 1 is the place at the end of that night
				{
					yaxis: 'y2axis',
					color: '#D3C9A9',
					lineWidth: 4,
					shadow: false,
					markerOptions: {
						show: true,
						size: 8,
						shadow: false
					},
					pointLabels: {
						location: 's',
						formatString: '%s (%%)',
						formatter: $.jqplot.ordinal
					}
				},
				// series 2 - points for that night
				{
					color: '#699DB1'
				},
				// series 3 is sub points so style it different
				{
					pointLabels: {
						show: false
					},
					showLine: false,
					markerOptions:{
						color:'#8DB27B'
					}
				}
			],
			axes:{
				xaxis: {
					tickOptions: {
						showGridline: false
					},
					showTicks: false
				},
				yaxis: {
					min: 0,
					max: 35,
					tickOptions: {
						formatString: '%d',
					}
				},
				y2axis: {
					min: Players.players.length,
					max: 1,
					showTicks: true,
					tickOptions: {
						formatString: '%d',
						formatter: $.jqplot.ordinal,
						showGridline: false
					}
				}
			},
			grid: {
				shadow:false,
				background: 'transparent'
			}
		};
		
	};

	PlayersController.$inject = injectParams;
	app.register.controller('PlayersController', PlayersController);


	(function($){
		$.jqplot.ordinal = function(format, val){
			// from http://ecommerce.shopify.com/c/ecommerce-design/t/ordinal-number-in-javascript-1st-2nd-3rd-4th-29259
			val = Math.round(val);
			var s=["th","st","nd","rd"],
				v=val%100;
			return val+(s[(v-20)%10]||s[v]||s[0]);
		};
	})(jQuery);
});