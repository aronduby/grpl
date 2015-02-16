define(['bower_components/slip/slip'], function(Slip){

	var app = angular.module('slip', []);

	app.directive('slip', function(){
		return{
			restrict: 'AE',
			scope: {
				controller: '=slipController'
			},
			link: function($scope, elem, attrs){

				var slip = new Slip(elem[0]),
					default_controller = {
						'swipe': angular.noop,
						'beforeswipe': angular.noop,
						'reorder': angular.noop,
						'beforereorder': angular.noop,
						'beforewait': angular.noop,
						'tap': angular.noop,
						'cancelswipe': angular.noop
					};

				$scope.controller = angular.extend({}, default_controller, $scope.controller);
				
				angular.forEach($scope.controller, function(val, key){
					elem.on('slip:'+key, val);
				});

				$scope.$on('$destory', function(){
					angular.forEach($scope.controller, function(val, key){
						elem.off('slip:'+key, val);
					});
				});
			}
		}
	});

	return app;

});