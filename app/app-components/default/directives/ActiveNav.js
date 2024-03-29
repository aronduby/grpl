define(['js/app'], function(app){
	
	/*
	 *	Adds/Removes .active class to link (or link parent) elements
	 *	Usage: <li activeNav><a href="/">home</a></li>
	*/
	app.directive('activeNav', ['$location', function($location) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var anchor = element[0];
				if(element[0].tagName.toUpperCase() != 'A')
					anchor = element.find('a')[0];
				var path = anchor.href;

				scope.location = $location;
				scope.$watch('location.absUrl()', function(newPath) {
					path = normalizeUrl(path);
					newPath = normalizeUrl(newPath);

					if(
						path === newPath 
						|| (attrs.activeNav === 'nestedTop' && newPath.indexOf(path) === 0)
					) {
						element.addClass('active');
					} else {
						element.removeClass('active');
					}
				});
			}
		};

		function normalizeUrl(url) {
			if(url[url.length - 1] !== '/')
				url = url + '/';
			return url;
		}
	}])

});