define(['js/app'], function(app){

	function Players($q, api, socket){

		this.loading = undefined;
		this.players = [];
		this.active = [];
		this.all = [];

		this.loadPlayers = function loadPlayers(){
			var self = this,
				d = $q.defer();

			self.loading = d.promise;

			api.get('players')
				.then(function(players){
					self.players = players;

					d.resolve(self.players);
				})
				.catch(function(err){
					d.reject(err);
				});
		};

		this.getActivePlayers = function getActivePlayers(){
			var self = this,
				d = $q.defer();

			if(this.active.length){
				d.resolve(this.active);
			} else {
				api.get('players.active')
					.then(function(players){
						self.active = players;

						d.resolve(self.players);
					})
					.catch(function(err){
						d.reject(err);
					});
			}

			return d.promise;
		};

		this.getAllPlayers = function getAllPlayers(){
			var self = this,
				d = $q.defer();

			if(this.all.length){
				d.resolve(this.all);
			} else {
				api.get('players.all')
					.then(function(players){
						self.all = players;

						d.resolve(self.players);
					})
					.catch(function(err){
						d.reject(err);
					});
			}

			return d.promise;
		};

		this.getFullForSeason = function getFullForSeason(name_key){
			var self = this,
				d = $q.defer();

			api.get('players.namekey', name_key)
				.then(function(player){
					d.resolve(player);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		this.getFullForAllTime = function getFullForAllTime(name_key){
			var self = this,
				d = $q.defer();

			api.get('players.all.namekey', name_key)
				.then(function(player){
					d.resolve(player);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		this.getSeasons = function getSeasons(name_key){
			var self = this,
				d = $q.defer();

			api.get('players.getSeasons', name_key)
				.then(function(seasons){
					d.resolve(seasons);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		this.getHeadToHead = function getHeadToHead(name_key){
			var self = this,
				d = $q.defer();

			api.get('players.headToHead', name_key)
				.then(function(head_to_head){
					d.resolve(head_to_head);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		this.getHeadToHeadAllTime = function getHeadToHeadAllTime(name_key){
			var self = this,
				d = $q.defer();

			api.get('players.headToHeadAllTime', name_key)
				.then(function(head_to_head_all_time){
					d.resolve(head_to_head_all_time);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};



		

		// add socket callbacks for adding/removing machines
	}
	
	app.service('Players', ['$q', 'api', 'socket', Players]);

	return app;
})