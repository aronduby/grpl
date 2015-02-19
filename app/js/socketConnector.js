// keeps angular from bootstraping until we're connected
define([], function(){

	var address = 'http://'+window.location.host+':834',
		options = {
			'sync disconnect on unload': true,
			'max reconnection attempts': 5
		}

	var socket = io.connect(address, options);

	// quick slap together a defer
	var promise = {
		okCallbacks: [],
		koCallbacks: [],
		status: null,
		data: null,
		then: function(okCallback){
			if(this.status == 'resolved'){
				okCallback(this.data);
			} else {
				this.okCallbacks.push(okCallback);
			}
		},
		fail: function(koCallback){
			if(this.status == 'rejected'){
				koCallback(this.data);
			} else {
				this.koCallbacks.push(koCallback);
			}
		}
	};

	var defer = {
		promise: promise,
		resolve: function(data){
			this.promise.status = 'resolved';
			this.promise.data = data;
			this.promise.okCallbacks.forEach(function(callback){
				window.setTimeout(function(){
					callback(data);
				}, 0)
			});
		},
		reject: function(err){
			this.promise.status = 'rejected';
			this.promise.data = data;
			this.promise.koCallbacks.forEach(function(callback){
				window.setTimeout(function(){
					callback(err);
				}, 0);
			});
		}
	};

	socket.on('connect', function(){
		defer.resolve(socket);
	});

	return defer.promise;

});