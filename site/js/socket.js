
var Socket = $.extend(io.connect('http://'+window.location.host+':834',{
		'sync disconnect on unload': true,
		'max reconnection attempts': 5

	}), $.PubSub, {

	// some predefined events
	// mostly just to resolve deferreds
	// I don't remember why events has to have the $ prepended (also in add)
	// but getting events from the server doesn't work without it
	$events: {
		/*
		connect: function(){
			this.callbacks.connect.resolve(arguments);
		},
		disconnect: function(){
			this.callbacks.disconnect.resolve(arguments);
		},
		*/
		reconnect_failed: function(){
			this.callbacks.reconnect_failed.resolve(arguments);
		},
		scoring_started: function(){
			this.callbacks.scoring_started.resolve(arguments);
		},
		scoring_stopped: function(){
			this.callbacks.scoring_stopped.resolve(arguments);
		},
		// add an event which just writes cookies
		write_cookie: function(key, value){
			$.cookie(key, value, {expires: 30});
		}
	},
	callbacks: {
		connect: $.Callbacks(),
		disconnect: $.Callbacks(),
		reconnect_failed: $.Deferred(),


		message: $.Callbacks(),
		echo: $.Callbacks(),
		error: $.Callbacks(),

		leaguenight_updated: $.Callbacks(),

		// scoring related
		scoring_started: $.Deferred(),
		scoring_stopped: $.Deferred(),
		scoring_logged_in: $.Callbacks(),
		scoring_other_logged_in: $.Callbacks(),
		scoring_update: $.Callbacks(),
		tiesbroken: $.Callbacks()
	},

	add: function(e, fn){
		// make sure we have that e callback
		if(e in this.callbacks == false)
			return false;

		// add it to our callback/deffer
		if(this.isDeferred(this.callbacks[e])){
			this.callbacks[e].then(fn);
		} else {
			this.callbacks[e].add(fn);
		}

		if(e in this.$events == false){
			var self = this;
			this.on(e, function(){
				if(self.isDeferred(self.callbacks[e])){
					self.callbacks[e].resolve.apply(self, arguments);
				} else {
					self.callbacks[e].fire.apply(self, arguments);
				}
			});	
		}

		return this;
	}

});