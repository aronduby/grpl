define(['js/app'], function(app){

	var bugifyLink = function(){
		return function(input){
			// console.log(input);
			return input.replace(/#(\d+)/g, '<a class="inline" href="http://bugify.aronduby.com/issues/$1" target="_blank">$&</a>')
		}
	};

	app.register.filter('bugifyLink', bugifyLink);

	return app;
});