define(['js/app', 'app-components/directives/ScoreEditor'], function(app){

	var injectParams = ['$scope', '$q', '$stateParams', '$state', '$filter', 'api', 'navApi', 'loadingOverlayApi', 'Seasons', 'LeagueNights', 'Machines', 'Players', 'dialog', 'flare'];

	var AdminEditScoresController = function($scope, $q, $stateParams, $state, $filter, api, navApi, loadingOverlayApi, Seasons, LeagueNights, Machines, Players, dialog, flare){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-nights-panel');

		$scope.night = null;
		$scope.nights = LeagueNights.nights;
		$scope.today = moment().startOf('day');
		$scope.machines = Machines.active;
		$scope.players = null;

		var players_promise = Players.getActivePlayers(),
			nights_defered = $q.defer(),
			nights_promise = nights_defered.promise;

		players_promise.then(function(ps){
			$scope.players = ps;
		});

		$scope.night = LeagueNights.getNight($stateParams.starts);
		// need checks for scoring started for this night
		if($scope.night === undefined){
			dialog({
				title: 'Night Not Found',
				headline: 'We Couldn\'t Find That Night',
				msg: 'It looks like the night you are trying to edit doesn\'t exist. Please use the night list to choose a different night.',
				btn_text: 'Ok'
			});
			loadingOverlayApi.hide();

		} else if($scope.scored === false){
			dialog({
				title: 'Night Not Scored',
				headline: 'There Aren\'t Any Scores for That Night',
				msg: 'It looks like that night hasn\'t been scored yet so theres nothing to edit. Please use the night list to choose a different night.',
				btn_text: 'Ok'
			});
			loadingOverlayApi.hide();

		} else {
			LeagueNights.getScores($scope.night.starts)
			.then(function(scores){
				navApi.setTitle($scope.night.title, $scope.night.description);
				formatScores(scores);
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}

		$scope.save = function save(scores){
			scores.starts = $scope.night.starts;
			loadingOverlayApi.show();
			api.post('scores.update', scores)
			.then(function(data){
				flare.success('<h1>Scores Saved</h1>', 5000);
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		};

		function formatScores(scores){
			var groups_by_machine = [],
				groups = [];

			groups = _.chain(scores)
				.groupBy('grouping')
				.map(function(group){
					var obj = {
						group: group[0].grouping,
						night_id: $scope.night.night_id,
						division_id: group[0].division_id,
						players: {},
						machines: {}
					};

					_.each(group, function(row){
						if(obj.players[row.name_key] == undefined){
							obj.players[row.name_key] = Players.getPlayer(row.name_key);
							obj.players[row.name_key].start_order = row.start_order;
						}

						if(row.abbv != null){
							if(obj.machines[row.abbv] == undefined){
								obj.machines[row.abbv] = {
									machine: _.find($scope.machines, {'abbv': row.abbv}),
									played_order: row.played_order,
									scores: [],
									picked_by: row.picked_by,
									mtln_id: row.mtln_id,
									division_id: row.division_id
								};
							}
						}

						if(row.score_id != null){
							obj.machines[row.abbv].scores.push(row);
						}
					});

					return obj;
				}).value();

			$scope.groups = groups;
		};

	};

	AdminEditScoresController.$inject = injectParams;
	app.register.controller('AdminEditScoresController', AdminEditScoresController);
});