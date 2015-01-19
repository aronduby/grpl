define([], function(){
	
	var BodyClasses = angular.module('BodyClasses', []);

	BodyClasses.factory('bodyClassesApi', ['$rootScope', function($rootScope){
		return {
			add: function(cls){
				$rootScope.$emit('body-classes-add', cls);
			},
			remove: function(cls){
				$rootScope.$emit('body-classes-remove', cls);
			},
			toggle: function(cls){
				$rootScope.$emit('body-classes-toggle', cls);
			}
		};
	}]);

	BodyClasses.directive('bodyClasses', ['$rootScope', function($rootScope){
		return {
			restrict: 'A',
			scope: {},
			link: function(scope, element, attrs){

				$rootScope.$on('body-classes-add', function(e, cls){
					element.addClass(cls);
				});

				$rootScope.$on('body-classes-remove', function(e, cls){
					element.removeClass(cls);
				});

				$rootScope.$on('body-classes-toggle', function(e, cls){
					element.toggleClass(cls);
				});
			}
		}
	}]);

})