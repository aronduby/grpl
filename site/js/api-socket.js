var Api = {
	default_opts: {
		success: function(){ console.log(arguments); },
		error: function(){ console.log(arguments); },
		complete: function(){ console.log('complete'); }
	},

	get: function(method, argument, opts){
		var d = $.Deferred();

		if(argument != undefined && opts == undefined){
			opts = argument;
			argument = undefined;
		}
		opts = $.extend({}, this.default_opts, opts);

		var cb = function(err, data){
			if(err){
				opts.error(err);
				d.reject(err);
			} else {
				opts.success(data);
				d.resolve(data);
			}
			opts.complete();
		}

		if(argument != null){
			Socket.emit(method, argument, cb);
		} else {
			Socket.emit(method, cb);
		}

		return d.promise();
	}
}