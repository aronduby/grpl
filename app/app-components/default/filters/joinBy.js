define(['js/app'], function(app){

	var joinBy = function(){
		return function(input, delimiter){
			return (input || []).join(delimiter || ', ');
		}
	};

	app.filter('joinBy', joinBy);

	return app;
});