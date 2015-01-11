define(['js/app'], function(app){

	app.filter('pluck', function() {
		function pluck(objects, property) {
			if (!(objects && property && angular.isArray(objects))) return [];
 
			property = String(property);
			
			return objects.map(function(object) {
				// just in case
				object = Object(object);
				
				if (object.hasOwnProperty(property)) {
					return object[property];
				}
				
				return '';
			});
		}
		
		return function(objects, property) {
			return pluck(objects, property);
		}
	});

	return app;
});