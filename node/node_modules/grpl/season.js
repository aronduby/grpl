var Q = require('q');

exports.getAll = function(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT season_id, title, scoring_order FROM season", function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var seasons = [];
			results.forEach(function(row){
				seasons.push(new Season(row.season_id, row.title, row.scoring_order));
			});
			d.resolve(seasons);
			db.release();
		})
	});

	return d.promise;
}

exports.getById = function(id){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT season_id, title, scoring_order FROM season WHERE season_id=?", [id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var row = results[0];
			d.resolve(new Season(row.season_id, row.title, row.scoring_order));
			db.release();
		})
	});

	return d.promise;
}

exports.getCurrent = function(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT season_id, title, scoring_order FROM season WHERE season_id = (SELECT v FROM config WHERE k='current_season')", function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var row = results[0];
			d.resolve(new Season(row.season_id, row.title, row.scoring_order));
			db.release();
		})
	});

	return d.promise;	
}

function getPool(){
	return module.parent.exports.pool;
}


// this allows us to create new empty items by saying new grpl.season.Season();
exports.Season = Season;

function Season(id, title, scoring_order){
	this.season_id = id;
	this.title = title;

	if(scoring_order !== undefined && scoring_order.length > 0){
		if(typeof scoring_order == 'string'){
			this.scoring_order = JSON.parse(scoring_order);
		} else {
			this.scoring_order = scoring_order;
		}
	};
}
Season.prototype.season_id = null;
Season.prototype.title = null;
Season.prototype.current = null;
Season.prototype.scoring_order = null;

Season.prototype.save = function(){
	var self = this,
		d = Q.defer();

	if(self.scoring_order){
		self.scoring_order = JSON.stringify(self.scoring_order);
	}

	var extend = require('util')._extend;
	var update = extend({}, self);
	delete update.season_id;

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }
		
		var query;
		query = db.query("INSERT INTO season SET ? ON DUPLICATE KEY UPDATE season_id=LAST_INSERT_ID(season_id), ?", [self, update], function(err, result) {
			if(err){ d.reject(err); db.release(); return false; }

			self.season_id = result.insertId;

			d.resolve(this);
			db.release();
		});
	});

	return d.promise;
}