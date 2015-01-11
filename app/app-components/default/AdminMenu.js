define([], function(){
	
	var AdminMenu = angular.module('AdminMenu', []);

	AdminMenu.factory('AdminMenuAPI', function(){
		return {
			enabled: false,
			open: false,
			enable: function(){
				this.enabled = true;
			},
			disable: function(){
				this.enabled = false;
			},
			toggle: function(){
				this.open = !!this.open;
			},
			show: function(){
				this.open = true;
			},
			hide: function(){
				this.open = false;
			}
		}
	});

	AdminMenu.directive('adminMenuClasses', ['AdminMenuAPI', function(AdminMenuAPI){
		return {
			restrict: 'A',
			scope: {},
			link: function(scope, element, attrs){
				scope.api = AdminMenuAPI;

				scope.enable = function(){
					element.removeClass('no-main-menu');
				};

				scope.disable = function(){
					element.addClass('no-main-menu');
				};

				scope.show = function(){
					element.removeClass('mmc');
					element.addClass('mme');
				};

				scope.hide = function(){
					element.addClass('mmc');
					element.removeClass('mme');
				};

				scope.$watch('api.enabled', function(enabled){
					if(enabled)
						scope.enable();
					else
						scope.disable();
				});
				scope.$watch('api.open', function(open){
					if(open)
						scope.show();
					else
						scope.hide();
				});
			}
		}
	}]);

	AdminMenu.controller('AdminMenuController', ['$scope', 'socket', 'Auth', function($scope, scoket, Auth){
		$scope.user = Auth.user;
	}]);

	return AdminMenu;

});