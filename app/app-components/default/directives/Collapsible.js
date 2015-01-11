define(['js/app'], function(app){
	
	app.directive('collapsible', [function() {
		return {
			restrict: 'A',
			link: function($scope, element, attrs) {

				element.addClass('collapsible');
				element.find('header').on('click', function(){
					toggle();
				});

				function open(){
					element.removeClass('closed');
				};

				function close(){
					element.addClass('closed');
				};

				function toggle(){
					element.toggleClass('closed');
				};

				attrs.$observe('open', function(open){
					if(open)
						open();
					else
						close();
				});
			}
		};
	}])

	return app;
});