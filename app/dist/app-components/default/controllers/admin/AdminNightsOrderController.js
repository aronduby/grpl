define(['js/app', 'app-components/directives/Slip'], function(app){

	var injectParams = ['$scope', '$q', '$window', '$stateParams', '$state', 'api', 'navApi', 'loadingOverlayApi', 'Seasons', 'LeagueNights', 'Machines', 'Players', 'dialog'];

	var AdminNightsOrderController = function($scope, $q, $window, $stateParams, $state, api, navApi, loadingOverlayApi, Seasons, LeagueNights, Machines, Players, dialog){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-nights-panel');

		$scope.has_errors = true;

		$scope.night = LeagueNights.getNight($stateParams.starts);
		// need checks for scoring started for this night
		if($scope.night === undefined){
			var d = dialog({
				title: 'Night Not Found',
				headline: 'We Couldn\'t Find That Night',
				msg: '<p>It looks like the night you are trying to edit doesn\'t exist. Please use the night list to choose a different night.</p>',
				btn_text: 'Ok'
			});
			loadingOverlayApi.hide();
			d.result.finally(function(){
				$window.history.back();
			});
		
		// Past night, can't edit order
		} else if( $scope.night.today === false && $scope.night.future === false ){
			var d = dialog({
				title: 'I\'m Afraid I Can\'t Let You Do That',
				headline: 'Live in the Now!',
				msg: '<p>You can\'t edit the order for a night that already happened.</p>',
				btn_text: 'Ok'
			});
			loadingOverlayApi.hide();
			d.result.finally(function(){
				$window.history.back();
			});
			

		} else {
			api.get('leaguenight.order', $scope.night.starts)
			.then(function(order){
				$scope.order = order.players;
				checkForErrors();
			})
			.catch(function(err){
				dialog.open(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}

		function checkForErrors(){
			var groups = _.groupBy($scope.order, 'grouping');
			_.each(groups, function(group){
				var error = false,
					playing = _.countBy(group, 'dnp')[false];

				if(playing < 3 || playing > 4){
					error = true;
				}

				_.each(group, function(player){
					player.error = error;
				});
			});
			$scope.has_errors = !!_.countBy($scope.order, 'error')[true];
		};

		$scope.setDNP = function(player){
			player.dnp = !player.dnp;
			checkForErrors();
		};

		$scope.save = function(){
			loadingOverlayApi.show();
			checkForErrors();
			if($scope.has_errors){
				loadingOverlayApi.hide();
				dialog({
					title: 'I Can\'t Let You Do That',
					headline: 'Error in the Groups',
					msg: 'You have at least one group with too few (< 3) or too many (> 4) players. You need to correct that before continuing.',
				});
			} else {
				var data = {
					starts: $scope.night.starts,
					season_id: $scope.night.season_id,
					order: $scope.order
				};

				api.post('leaguenight.update.order', data)
				.then(function(){
					$state.go('public.nights', {'starts': $scope.night.starts});
				})
				.catch(function(err){
					loadingOverlayApi.hide();
					dialog(err);
				});
			}
		}



		// slip events
		$scope.slipController = {
			beforeswipe: function(e){
				e.preventDefault();
			},
			beforereorder: function(e){
				if(e.target.classList.contains('disabled') || e.target.nodeName == 'BUTTON')
					e.preventDefault();
			},
			reorder: function(e){

				var move = _.find($scope.order, {'name_key': e.target.dataset.nameKey}),
					move_from = _.indexOf($scope.order, move),
					after = e.detail.insertBefore.dataset.after,
					before = _.find($scope.order, {'name_key': e.detail.insertBefore.dataset.nameKey}),
					grouping = e.detail.insertBefore.dataset.grouping,
					start_order = e.detail.insertBefore.dataset.startOrder;

				$scope.$apply(function(){

					move = $scope.order.splice(move_from, 1)[0];
					move.grouping = parseInt(grouping, 10);

					var move_to = _.indexOf($scope.order, before);
					if(after != undefined)
						move_to++;
					
					$scope.order.splice(move_to, 0, move);
					_.each($scope.order, function(obj, idx){
						obj.start_order = idx;
					});

					checkForErrors();
				});
			}
		};
		
	};

	AdminNightsOrderController.$inject = injectParams;
	app.register.controller('AdminNightsOrderController', AdminNightsOrderController);
});