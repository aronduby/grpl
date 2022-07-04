define(['js/app'], function(app){

	function Machines($q, api, socket){

		this.loading = undefined;
		this.all = [];
		this.active = [];
		this.helper = [];

		this.loadMachines = function loadMachines(){
			var self = this,
				d = $q.defer();

			self.loading = d.promise;

			api.get('machine.all')
				.then(function(machines){

					
					self.all = machines;
					self.active = _.filter(self.all, {status: 'active'});
					self.helper = _.filter(self.all, {status: 'helper'});

					d.resolve(self.active);
				})
				.catch(function(err){
					d.reject(err);
				});
		};

		this.randomMachine = function randomMachine(include_inactive){
			return _.sample( include_inactive===true ? this.all : this.active );
		};

		this.getMachine = function getMachine(abbv){
			return _.find( this.all, {'abbv': abbv});
		}

		this.getPreviousPicks = function getPreviousPicks() {
			var d = $q.defer();

			api.get('machine.getPreviousPicksForSeason')
				.then((picks) => {
					Object.keys(picks).forEach(nameKey => {
						picks[nameKey].forEach(pick => {
							pick.machine = this.getMachine(pick.abbv);
						});
					});

					d.resolve(picks);
				})
				.catch(function(err) {
					d.reject(err);
				});

			return d.promise;
		}

		/*
		 *	Socket Events
		*/
		function machineUpdated(data){
			var idx = _.indexOf(_.pluck(this.all, 'machine_id'), data.machine_id);
			if(idx >= 0){
				this.all.splice(idx, 1, data);
			} else {
				this.all.push(data);
			}
			this.active = _.filter(this.all, {status: 'active'});
			this.helper = _.filter(this.all, {status: 'helper'});
		};
		socket.on('machine_updated', angular.bind(this, machineUpdated));

	}
	
	app.service('Machines', ['$q', 'api', 'socket', Machines]);

	return app;
})