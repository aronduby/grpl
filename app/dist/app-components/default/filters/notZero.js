define(['js/app'], function(app){

	var notZero = function(){
		return function(input){
			return input === 0 || input === '0' ? '' : input;
		}
	};

	app.filter('notZero', notZero);

	return app;
});