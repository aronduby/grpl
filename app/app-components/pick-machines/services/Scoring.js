define(['js/app'], function(app){
	
	function Scoring($q, api, socket, Players, Machines, flare, dialog, $state){

		var self = this;
		this.started = false;
		this.starts = false;
		this.night = false;
		this.logged_in_users = [];

		this.emitIfStarted = function(){
			// not setup with callback, listen for the event
			// done so it can respond to other people starting scoring
			api.get('scoring.emitIfStarted');
		};

		this.start = function(starts){
			var d = $q.defer();

			if(!starts){
				d.reject({
					title: 'Error',
					headline: 'Can\'t try to start scoring without a night',
					msg: 'You tried to start scoring without having a night associated with it, which obviously won\'t work'
				});
			} else {
				api.get('scoring.start', starts)
				.then(function(data){
					d.resolve(data);
				})
				.catch(function(err){
					d.reject(err);
				});	
			}

			return d.promise;
		};

		this.stop = function(){
			var d = $q.defer();

			api.get('scoring.stop')
			.then(function(bool){
				d.resolve(bool);
			})
			.catch(function(err){
				d.reject(err);
			});

			return d.promise;
		};

		this.login = function(){
			var d = $q.defer();

			// should we check if someone else is logged in?
			api.post('scoring.login')
			.then(function(){
				d.resolve();
			})
			.catch(function(err){
				d.reject(err);
			});

			return d.promise;
		};

		this.submit = function(data){
			var d = $q.defer(),
				self = this;

			api.post('scoring.update', data)
			.then(function(data){
				d.resolve(true);
			})
			.catch(function(err){
				d.reject(err);
			});

			return d.promise;
		};

		this.getGroupForUser = function(name_key){
			var d = $q.defer();

			api.get('scoring.getGroupForUser', name_key)
			.then(function(data){
				_.each(data.players, function(player){
					player.dnp = player.dnp == 'true';
					player.data = Players.playerData(player.name_key);
				});

				d.resolve(data);
			})
			.catch(function(err){
				d.reject(err);
			});

			return d.promise;
		}




		function whenStarted(data){
			// private function to setup the object as needed
			self.started = data.started;
			self.night = {
				starts: data.starts,
				night_id: data.night_id,
				divisions: _.values(data.divisions)
			};
			
			// convert division abbv machines to full machines
			_.each(self.night.divisions, function(division, didx){
				_.each(division.machines, function(abbv, midx){
					self.night.divisions[didx].machines[midx] = Machines.getMachine(abbv);
				});
			});
		};

		function stopped(data){
			// private function to "disassemble" the object when scoring is stopped
			self.started = false;
			self.night = {};
			// this.players = [];
		};

		function logged_in(user){
			// private function to log users in
			// console.log('scoring logged in', data);
		};

		function updated(data){
			// private function to update the data
			var players = _.flatten(_.pluck(_.pluck(self.night.divisions, 'player_list'),'players'));

			_.each(data.players, function(score, name_key){
				var player = _.find(players, {'name_key': name_key});				
				if(player.machines == null){
					player.machines = [];
				}
				player.machines[data.played_order] = {abbv: data.abbv, points: score};
				// get the total of all the machines
				player.night_score = _.reduce(player.machines, function(memo, machine){ return memo + machine.points; }, 0);
			});

			// add the machine to the divisions
			// but only if it's not already there
			var div = _.find(this.night.divisions, {'division_id': data.division_id}),
				mac = _.find(div.machines, {'abbv': data.abbv});

			if(mac == undefined){
				div.machines.push(Machines.getMachine(data.abbv));
			}

		};


		socket
		.on('scoring_started', angular.bind(self, whenStarted))
		.on('scoring_stopped', angular.bind(self, stopped))
		.on('scoring_logged_in', angular.bind(self, logged_in))
		.on('scoring_update', angular.bind(self, updated));



	}


	app.service('Scoring', ['$q', 'api', 'socket', 'Players', 'Machines', 'flare', 'dialog', '$state', Scoring]);

	return app;

});