define(['js/app'], function(app){

	var mathAbs = function(){
		return function(input){
			return Math.abs(input);
		}
	};

	app.filter('mathAbs', mathAbs);

	return app;
});