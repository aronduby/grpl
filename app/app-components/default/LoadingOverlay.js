define(['app-components/BodyClasses'], function(){
	
	var LoadingOverlay = angular.module('LoadingOverlay', ['BodyClasses']);

	LoadingOverlay.factory('loadingOverlayApi', ['bodyClassesApi', function(bodyClassesApi){
		return {
			open: false,
			show: function(){
				bodyClassesApi.add('loading');
			},
			hide: function(){
				bodyClassesApi.remove('loading');
			},
			toggle: function(){
				bodyClassesApi.toggle('loading');
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