// keeps angular from bootstraping until we're connected
define(['bower_components/angular/angular.min.js'], function(){

	var address = 'http://'+window.location.host+':834',
		options = {
			'sync disconnect on unload': true,
			'max reconnection attempts': 5
		};

	var socket = io.connect(address, options);

	socket.on('connect', function(){
		angular.resumeBootstrap();
	});

	return socket;

});