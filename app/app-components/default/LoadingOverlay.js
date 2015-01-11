define([], function(){
	
	var LoadingOverlay = angular.module('LoadingOverlay', []);

	LoadingOverlay.factory('loadingOverlayApi', function(){
		return {
			open: false,
			show: function(){
				this.open = true;
			},
			hide: function(){
				this.open = false;
			},
			toggle: function(){
				this.open = !this.open;
			}
		}
	});

	LoadingOverlay.directive('loadingOverlayClasses', ['loadingOverlayApi', function(loadingOverlayApi){
		return {
			restrict: 'A',
			scope: {},
			link: function(scope, element, attrs){
				scope.api = loadingOverlayApi;

				scope.show = function(){
					element.addClass('loading');
				};

				scope.hide = function(){
					element.removeClass('loading');
				};

				scope.$watch('api.open', function(open){
					if(open)
						scope.show();
					else
						scope.hide();
				});
			}
		}
	}]);

	LoadingOverlay.directive('loadingOverlay', [function(){
		return {
			restrict: 'EA',
			replace: true,
			template: '<div id="loading-container">' + 
				'<div id="loading">'+
					'<div class="inner">' + 
						'<div class="text">' + 
							'<span>l</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span>' + 
						'</div>' + 
					'</div>' + 
				'</div>' + 
				'<div class="overlay"></div>' +
			'</div>'

		}
	}]);


	return LoadingOverlay;

});