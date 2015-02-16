define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', '$stateParams', '$state', 'api', 'navApi', 'loadingOverlayApi', 'Seasons', 'LeagueNights', 'Machines', 'Players', 'dialog'];

	var AdminNightsController = function($scope, $q, $stateParams, $state, api, navApi, loadingOverlayApi, Seasons, LeagueNights, Machines, Players, dialog){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-nights-panel');

		$scope.night = null;
		$scope.nights = LeagueNights.nights;
		$scope.today = moment().startOf('day');
		$scope.machines = Machines.active;
		$scope.players = null;

		$scope.post_save_options = [{val: 'index', label:'View the Rankings'}, {val:'order', label:'Edit the Player Order'}];
		$scope.post_save = $scope.post_save_options[0];
		

		var players_promise = Players.getActivePlayers(),
			nights_defered = $q.defer(),
			nights_promise = nights_defered.promise;

		players_promise.then(function(ps){
			$scope.players = ps;
		});

		if($stateParams.starts === 'new'){
			// setup a new night
			$scope.night = {
				night_id: null,
				season_id: Seasons.current_id,
				title: 'League Night #2',
				moment: moment('2015-01-21').toString(),
				subs: []
			};
			navApi.setTitle('New League Night', 'Create a New Night');

			// grab the divisions for this season
			api.get('division.getForSeason', Seasons.active_id)
			.then(function(divisions){
				$scope.night.divisions = divisions;
				loadingOverlayApi.hide();
			});

		} else {
			$scope.night = LeagueNights.getNight($stateParams.starts);
			// need checks for scoring started for this night
			if($scope.night === undefined){
				dialog({
					title: 'Night Not Found',
					headline: 'We Couldn\'t Find That Night',
					msg: 'It looks like the night you are trying to edit doesn\'t exist. Please use the night list to choose a different night',
					btn_text: 'Ok'
				});
				loadingOverlayApi.hide();
			} else {
				LeagueNights.getFullNight($scope.night.starts)
				.then(function(night){
					$scope.night = night;
					navApi.setTitle($scope.night.title, $scope.night.description);

					// make the machines a reference to the scope machines so selects work right
					_.each($scope.night.divisions, function(division){
						_.each(division.machines, function(machine, idx){
							division.machines[idx] = _.find($scope.machines, {'abbv': machine.abbv});
						});
					});

					// make the subbed players a reference so selects work right
					players_promise.then(function(ps){
						var subs = [];
						_.each($scope.night.subs, function(data, name_key){
							data.player = _.find($scope.players, {'name_key': name_key});
							subs.push(data);
						});
						$scope.night.subs = subs;
					});
					
				})
				.catch(function(err){
					dialog(err);
				})
				.finally(function(){
					loadingOverlayApi.hide();
				});
			}
		}

		$scope.addSub = function addSub(){
			$scope.night.subs.push({sub_id: null, sub: null, player: null});
		};

		$scope.removeSub = function removeSub(idx){
			$scope.night.subs.splice(idx,1);
		};

		$scope.save = function save(){
			loadingOverlayApi.show();

			var n = $scope.night;
			n.moment = moment(n.moment);

			var data = {
				night_id: n.night_id,
				season_id: n.season_id,
				title: n.title,
				starts:{
					month: n.moment.month() + 1, // server expects 1= Jan, moment is 0 = Jan
					day: n.moment.date(),
					year: n.moment.year()
				},
				description: n.moment.format('MMMM Do, YYYY'),
				note: n.note,
				divisions: [],
				subs: []
			};
			
			// add the divisions
			_.each(n.divisions, function(d){
				data.divisions.push({
					division_id: d.division_id,
					machines: _.pluck(d.machines, 'abbv')
				});
			});

			// add the subs
			_.each(n.subs, function(sub){
				data.subs.push({
					sub_id: sub.sub_id,
					name_key: sub.player.name_key,
					sub: sub.sub
				});
			});

			api.post('leaguenight.update', data)
			.then(function(r){
				console.log(r);
				switch($scope.post_save.val){
					case 'index':
					default:
						$state.go('public.nights');
						break;

					case 'order':
						$state.go('admin.nights.order', {starts: n.moment.format('YYYY-MM-DD')});
				};
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
			
		};
	};

	AdminNightsController.$inject = injectParams;
	app.register.controller('AdminNightsController', AdminNightsController);
});