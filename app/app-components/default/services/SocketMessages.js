define(['js/app', 'app-components/services/socket'], function(app){

	function SocketMessages($filter, socket, flare, Players){

		function tiesbroken(data){
			var msg = '<h1>Tie Broken</h1>';
			msg += '<ul>';

			data.players.sort(function(a, b){
				return a.place < b.place ? -1 : 1;
			});

			_.each(data.players, function(p){
				msg += '<li>'+$filter('ordinal')(p.place)+': '+Players.playerData(p.name_key).full_name+'</li>';
			});

			msg += '</ul>';

			flare.info(msg, 3000);
		};
		socket.on('tiesbroken', tiesbroken);
	}

	app.service('SocketMessages', ['$filter', 'socket', 'flare', 'Players', SocketMessages]);
	
	return app;

});