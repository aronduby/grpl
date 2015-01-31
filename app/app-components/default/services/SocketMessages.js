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


		function scoringStarted(data){
			flare.info('<h1>Scoring is Started</h1><p>Hope you have multiple jackpots!</p>', 3000);
		};
		socket.on('scoring_started', scoringStarted);


		function scoringStopped(){
			flare.info('<h1>Scoring has been Stopped</h1><p>The scores are in, check how you did</p>', 3000);
		}
		socket.on('scoring_stopped', scoringStopped);


		function scoringUpdated(data){
			var msg = '<h1>Scoring Updated</h1><p>On '+data.abbv+':</p>';
			msg += '<ul>';

			var scores = [];
			_.each(data.players, function(score, name_key){
				scores.push({
					score: score,
					li: '<li>'+score+': '+Players.playerData(name_key).full_name+'</li>'
				});
			});

			scores.sort(function(a,b){
				return a.score > b.score ? -1 : 1;
			});

			msg += _.pluck(scores, 'li').join('');

			msg += '</ul>';

			flare.success(msg, 5000);
		}
		socket.on('scoring_update', scoringUpdated);
	}

	app.service('SocketMessages', ['$filter', 'socket', 'flare', 'Players', SocketMessages]);
	
	return app;

});