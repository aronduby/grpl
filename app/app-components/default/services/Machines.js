define(['js/app'], function(app){

	function Machines($q, api, socket){

		this.loading = undefined;
		this.all = [];
		this.active = [];

		this.loadMachines = function loadMachines(){
			var self = this,
				d = $q.defer();

			self.loading = d.promise;

			api.get('machine.all')
				.then(function(machines){

					_.each(machines, function(machine){
						machine.active = !!machine.active;
					});

					self.all = machines;
					self.active = _.filter(machines, 'active');

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

		// add socket callbacks for adding/removing machines
	}
	
	app.service('Machines', ['$q', 'api', 'socket', Machines]);

	return app;
})