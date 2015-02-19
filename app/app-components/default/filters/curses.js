define(['js/app'], function(app){

	// wraps curse words (or whatever words you tell it) with span tags
	var curses = function(){
		return function(input, words, class_name){
			var re = new RegExp('('+words.join('|')+')', 'gi'),
				subst = '<span class="'+class_name+'">$1</span>'; 
				
			return input.replace(re, subst);
		}
	};

	app.register.filter('curses', curses);

	return app;
});