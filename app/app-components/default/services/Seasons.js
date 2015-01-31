define(['js/app'], function(app){

	function Seasons($q, api, socket){

		this.loading = undefined;
		this.all = [];
		
		this.current = null;
		this.active = null;

		this.active_id = null;
		this.current_id = null;

		this.loadSeasons = function loadSeasons(){
			var self = this,
				d = $q.defer();

			self.loading = d.promise;

			api.get('seasons.getAll')
				.then(function(seasons){
					self.all = seasons;

					this.current = _.find(this.all, {'season_id': this.current_id});
					this.active = _.find(this.all, {'season_id': this.active_id});

					d.resolve(self.seasons);
				})
				.catch(function(err){
					d.reject(err);
				});
		};

		this.setCurrent = function setCurrent(id){
			this.current_id = id;
			this.current = this.getBySeasonId(id);
		};

		this.setActive = function setActive(id){
			this.active_id = id;
			this.active = this.getBySeasonId(id);
		};

		this.getBySeasonId = function getBySeasonId(id){
			return _.find(this.all, {'season_id': id});
		}

		/*
		 *	Socket Events
		*/
		function seasonUpdated(data){
			
			var season = _.find(this.all, {'season_id': data.season_id});
			if(season != undefined){
				season.title = data.title;
			} else {
				this.all.push(data);
			}

			if(data.current === true){
				this.setCurrent(data.season_id);
			}
		};

		socket.on('season_updated', angular.bind(this, seasonUpdated));
	}
	
	app.service('Seasons', ['$q', 'api', 'socket', Seasons]);

	return app;
});
