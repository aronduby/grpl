define(['js/app'], function(app){

	function LeagueNights($q, api, socket){

		this.loading = undefined;
		this.nights = [];

		this.loadNights = function loadNights(){
			var self = this,
				d = $q.defer();

			self.loading = d.promise;

			api.get('leaguenight')
				.then(function(nights){
					var today = moment().startOf('day');

					_.each(nights, function(night){
						if(night.starts == 'totals'){
							night.moment = moment();
							night.totals = true;
							night.today = false;
							night.future = true;
						} else {
							night.moment = moment(night.starts);
							if(night.moment.isSame(today)){
								night.today = true;
								night.future = false;
							} else {
								night.today = false;
								night.future = night.moment.isAfter(today);
							}
							night.totals = false;
						}
					});

					self.nights = nights;
					d.resolve(nights);
				})
				.catch(function(err){
					d.reject(err);
				});
		};

		/*
		 *	Pulls from the night only data from current array
		*/
		this.getNight = function getNight(starts){
			return _.find(this.nights, {'starts': starts});
		};

		this.getNextNight = function getNextNight(){
			var today = moment().startOf('day');
			return _.find(this.nights, function(night){
				if(night.starts === 'totals')
					return false;
				return night.moment.isAfter(today);
			});
		};

		this.getTotals = function getTotals(){
			return this.getNight('totals');
		};

		/*
		 *	This does the full query for all the data for a single night
		*/
		this.getFullNight = function getFullNight(starts){
			var d = $q.defer(),
				method, arg;

			if(starts === 'totals'){
				method = 'totals';
				arg = null;
			} else {
				method = 'starts';
				arg = starts;
			}

			this_nights_promise = api.get('leaguenight.'+method, arg)
				.then(function(night){
					var today = moment().startOf('day');
					
					if(night.starts == 'totals'){
						night.moment = moment();
						night.totals = true;
						night.today = false;
						night.future = true;
					} else {
						night.moment = moment(night.starts);
						if(night.moment.isSame(today)){
							night.today = true;
							night.future = false;
						} else {
							night.today = false;
							night.future = night.moment.isAfter(today);
						}
						night.totals = false;
					}
					d.resolve(night);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		// add socket callbacks for adding/removing nights
	}
	
	app.service('LeagueNights', ['$q', 'api', 'socket', LeagueNights]);

	return app;
})