define(['js/app'], function(app){
	
	app.directive('collapsible', ['$localStorage', function($localStorage) {
		return {
			restrict: 'A',
			scope: {
				callback: '&collapseCallback'
			},
			link: function(scope, element, attrs) {
				
				var id = attrs.collapsible,
					save = false;

				scope.closed = false;
				scope.storage = $localStorage.$default({ collapsibles: {} });


				scope.$watch('closed', function(closed){				
					if(closed == true){
						element.addClass('closed');
					} else {
						element.removeClass('closed');
					}
					if(save)
						scope.storage.collapsibles[id] = closed;

					scope.callback({'closed':closed});
				});

				if(id != ''){
					save = true;
					scope.closed = scope.storage.collapsibles[id];
					if(scope.closed == undefined)
						scope.closed == false;
				}

				scope.open = function(){ scope.closed = false; }
				scope.close = function(){ scope.closed = true; }
				scope.toggle = function(){ scope.closed = !scope.closed; }

				element.addClass('collapsible');
				var header = angular.element(element.find('header')[0]);
				header.on('click', function(e){
					scope.$apply(function(){
						scope.toggle();
					});
					e.stopPropagation();
				});

				attrs.$observe('closed', function(closed){
					if(closed == '' || closed == 'true' || closed == '1'){
						scope.closed = true;
					} else {
						scope.closed = false;
					}
				});
			}
		};
	}])

	return app;
});