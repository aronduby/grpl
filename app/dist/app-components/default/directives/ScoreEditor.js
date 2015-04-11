define(function(require){
	
	var app = require('js/app');

	app.register.filter('orderObj', function() { 
		return function(obj) {
			if (!(obj instanceof Object)) return obj;
			return _.map(obj, function(val, key) {
				return Object.defineProperty(val, '$key', {__proto__: null, value: key});
			});
		}
	});

	app.register.directive('scoreEditor', ['$filter', 'api', 'loadingOverlayApi', '$modal', function($filter, api, loadingOverlayApi, $modal){
		return {
			restrict: 'E',
			scope: {
				index: '=',
				group: '=',
				machines: '=',
				parentSave: '&save'
			},
			templateUrl: 'app-components/partials/score-editor.html',
			link:  function(scope, element, attrs) {
				scope.edit = false;
				scope.copy = null;
				scope.delete = {
					mtln: [],
					scores: []
				};

				// when a machine changes, update the abbv in the scores
				// TODO - do the same with the played_order
				scope.$watch('copy.machines', function(newVal, oldVal){
					if(newVal != undefined && oldVal != undefined){
						_.each(newVal, function(mac, abbv){
							// if there's a legit machine (we didn't just add a row)
							if(	mac.machine != null ){

								// if the old machine didn't exist, or we changed machines
								// update the abbv in the scores to match
								if( oldVal[abbv].machine == null || mac.machine.abbv !== oldVal[abbv].machine.abbv ){
									_.each(mac.scores, function(score){
										score.abbv = mac.machine.abbv;
									});	
								}

								// if the played order doesn't match
								// update the played order in the scores to match
								if( oldVal[abbv].machine == null || mac.played_order !== oldVal[abbv].played_order ){
									_.each(mac.scores, function(score){
										score.played_order = mac.played_order;
									});		
								}
								
							}
						});
					}					
				}, true);

				scope.toggleEdit = function(){
					scope.edit = !scope.edit;
					if(scope.edit){
						scope.copy = angular.copy(scope.group);

						// selects have to be a reference
						_.each(scope.copy.machines, function(m){
							if(m != null)
								m.machine = _.find(scope.machines, {'abbv': m.machine.abbv});
						});
					} else {
						scope.copy = null;
					}
				};

				scope.add = function(){
					var machine = {
						picked_by: null,
						played_order: 0,
						machine: null,
						mtln_id: null,
						scores: []
					};

					if(_.keys(scope.copy.machines).length){
						var max_po = _.chain(scope.copy.machines)
							.pluck('played_order')
							.reduce(function(a,b){ return Math.max(a,b); })
							.value();
						machine.played_order = ++max_po;
					}

					_.each(scope.copy.players, function(player){
						machine.scores.push({
							abbv: '',
							grouping: scope.copy.group,
							name_key: player.name_key,
							night_id: scope.copy.night_id,
							played_order: machine.played_order,
							points: 0,
							score_id: null,
							start_order: player.start_order,
							mtln_id: null
						});
					});

					scope.copy.machines[_.uniqueId('abbv_')] = machine;
				};

				scope.remove = function(key, machine){
					if(machine.mtln_id != null){
						// set the mtln_id and all the score_ids to be deleted from the db
						scope.delete.mtln.push(machine.mtln_id);
						scope.delete.scores = scope.delete.scores.concat(_.pluck(machine.scores, 'score_id'));
					}
					delete scope.copy.machines[key];
				};

				scope.save = function(){
					scope.group = angular.copy(scope.copy);
					scope.copy = null;

					var data = {
						delete: scope.delete,
						scores: _.chain(scope.group.machines).pluck('scores').flatten().value()
					};

					scope.parentSave({
						scores: data
					});
				};
			
			}
		};
	}]);

});