define(function(require){
	
	var app = require('js/app');

	app.directive('abbr', ['Machines', '$modal', function(Machines, $modal){
		return {
			link: function(scope, element, attrs){
				var clicked = function(){
					var modalInstance = $modal.open({
						templateUrl: 'app-components/partials/machine-abbv-dialog.html',
						controller: function($scope, $modalInstance, machine){
							$scope.machine = machine;
							$scope.close = function(){
								$modalInstance.close();
							};
						},
						resolve: {
							machine: function(){ return Machines.getMachine(element.text()) }
						}
					});
				}

				element.on('click', clicked);
			}
		}
	}]);
})