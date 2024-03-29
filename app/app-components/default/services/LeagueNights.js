define(['js/app'], function(app){

    LeagueNights.$inject = ['$q', '$rootScope', 'api', 'socket', 'Scoring'];
	function LeagueNights($q, $rootScope, api, socket, Scoring){
        var self = this;
		var today = moment().startOf('day');

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
						setupNight(night);
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

		this.getNextNight = function getNextNight(include_today){
			var today = moment().startOf('day');
			return _.find(this.nights, function(night){
				if(night.starts === 'totals')
					return false;
				return include_today ? 
					night.moment.isSame(today) || night.moment.isAfter(today)
					: night.moment.isAfter(today);
			});
		};

		this.getMostRecentNight = function getMostRecentNight(){
			var today = moment().startOf('day');

			return _.find(this.nights, function(night){
				if(night.starts === 'totals')
					return false;
				return night.moment.isBefore(today);
			});
		};

		this.getNextOrMostRecentNight = function getNextOrMostRecentNight(include_today){
			var r = this.getNextNight(include_today);
			if(r === undefined){
				r = this.getMostRecentNight();
			}
			return r;
		}

		this.getTotals = function getTotals(){
			return this.getNight('totals');
		};

		this.getPreviousNight = function getPreviousNight(starts){
			var before = moment(starts);

			return _.find(this.nights, function(night){
				if(night.starts === 'totals')
					return false;
				return night.moment.isBefore(before);
			});
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
					setupNight(night);
					d.resolve(night);
				})
				.catch(function(err){
					d.reject(err);
				});

			return d.promise;
		};

		this.getScores = function getScores(starts){
			var d = $q.defer();

			api.get('leaguenight.scores', starts)
			.then(function(scores){
				d.resolve(scores);
			})
			.catch(function(err){
				d.reject(err);
			});

			return d.promise;
		};

		function setupNight(night){
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
		}

		/*
		 *	Socket Events
		*/
		function leaguenightUpdated(data){
			setupNight(data);
			var idx = _.indexOf(_.pluck(self.nights, 'night_id'), data.night_id);
			if(idx == -1){
				self.nights.push(data);
			} else {
				self.nights.splice(idx, 1, data);
			}
		}

        function scoringStopped(night_id) {
            var scoredNight = _.find(self.nights, {'night_id': parseInt(night_id, 10)});
            scoredNight.scored = true;
        }

		socket
			.on('leaguenight_updated', angular.bind(this, leaguenightUpdated))
            .on('scoring_stopped', angular.bind(this, scoringStopped));
	}
	
	app.service('LeagueNights', LeagueNights);

	return app;
})