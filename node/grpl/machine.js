var Q = require('q');

/*
 *	Controller Functions
*/
exports.getByAbbv = function(abbv){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }
		db.query("SELECT * FROM machine WHERE abbv=?", [abbv], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			d.resolve(new Machine(results[0]));
			db.release();
		});
	});

	return d.promise;
}


exports.getForLeagueNight = function(starts){
	var d = Q.defer(),
		machines = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT m.*, mtln.picked_by FROM league_night n JOIN machine_to_league_night mtln USING(night_id) JOIN machine m USING(abbv) WHERE n.starts=? ORDER BY display_order";
		db.query(sql, [starts], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			results.forEach(function(row){
				machines.push(new Machine(row));
			});
			d.resolve(machines);
			db.release();
		});
	});

	return d.promise;
}

exports.getForLeagueNightAndDivision = function(starts, division_id){
	var d = Q.defer(),
		machines = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT "+
			"m.*, mtln.picked_by, mtln.grouping, lns.played_order " +
		"FROM " +
			"league_night n " +
			"JOIN machine_to_league_night mtln USING(night_id) " +
			"JOIN machine m USING(abbv) " +
			"LEFT JOIN league_night_score lns ON lns.night_id = mtln.night_id AND lns.name_key = mtln.picked_by AND lns.abbv = mtln.abbv " + 
		"WHERE " +
			"n.starts = ? " +
			"AND mtln.division_id = ? " +
		"ORDER BY " +
			"display_order";

		db.query(sql, [starts, division_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			results.forEach(function(row){
				machines.push(new Machine(row));
			});
			d.resolve(machines);
			db.release();
		});
	});

	return d.promise;
}

exports.getPreviousPicksForSeason = function(season_id) {
	var d = Q.defer(),
		picks = [];

	getPool().getConnection((function(err, db) {
		if (err) { d.reject(err); return false; }

		var sql = "SELECT * FROM " +
				"machine_to_league_night " +
			"WHERE " +
				"night_id IN  (SELECT night_id FROM league_night WHERE season_id = ?) " +
			"ORDER BY " +
				"picked_by, night_id";

		db.query(sql, [season_id], function(err, results) {
			if(err){ d.reject(err); db.release(); return false; }

			picks = results.reduce(function(acc, row) {
				if (!acc.hasOwnProperty(row.picked_by)) {
					acc[row.picked_by] = [];
				}

				acc[row.picked_by].push(row);
				return acc;
			}, {});

			d.resolve(picks);
			db.release();
		});
	}));

	return d.promise;
}


exports.getForSeason = function(season_id){
	var d = Q.defer(),
		machines = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT * FROM machine WHERE season_id=? ORDER BY abbv";
		db.query(sql, [season_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			results.forEach(function(row){
				machines.push(new Machine(row));
			});
			d.resolve(machines);
			db.release();
		});
	});

	return d.promise;
}

exports.getActive = function(){
	var d = Q.defer(),
		machines = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT * FROM machine WHERE status='active' ORDER BY abbv";
		db.query(sql, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			results.forEach(function(row){
				machines.push(new Machine(row));
			});
			db.release();
			d.resolve(machines);
		});
	});

	return d.promise;
}

exports.getAll = function(){
	var d = Q.defer(),
		machines = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT * FROM machine ORDER BY name";
		db.query(sql, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			results.forEach(function(row){
				machines.push(new Machine(row));
			});
			db.release();
			d.resolve(machines);
		});
	});

	return d.promise;
}


exports.getLastUpdated = function(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SHOW TABLE STATUS LIKE 'machine'";
		db.query(sql, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var updated = results[0].Update_time;
			d.resolve( updated );
			db.release();
		});
	});

	return d.promise;
}


function getPool(){ return module.parent.exports.pool; }
function nl2br(str, is_xhtml){
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>'; // Adjust comment to avoid issue on phpjs.org display
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

/*
 *	Actual Object
*/
exports.Machine = Machine;
function Machine(opts){
	for(prop in opts){
		if (prop in this) {
			this[prop] = opts[prop];
		}
	}
	if(this.note != null && this.note.length)
		this.note = nl2br(this.note);
}
Machine.prototype.machine_id = null;
Machine.prototype.name = null;
Machine.prototype.abbv = null;
Machine.prototype.image = null;
Machine.prototype.url = null;
Machine.prototype.note = null;
Machine.prototype.status = null;
Machine.prototype.picked_by = null;
Machine.prototype.grouping = null;
Machine.prototype.played_order = null;

Machine.prototype.save = function(){
	var self = this,
		write = {},
		d = Q.defer();

	// make sure we aren't trying to update fields not in the datbase
	var skip = ['picked_by', 'grouping', 'played_order'];
	for(var fld in this){
		if(this.hasOwnProperty(fld) && skip.indexOf(fld) < 0) // has the field, and its not in our array 
			write[fld] = this[fld];
	}

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }
		var query = db.query("INSERT INTO machine SET ? ON DUPLICATE KEY UPDATE ?", [write, write], function(err, result) {
			if(err){ d.reject(err); db.release(); return false; }
			d.resolve(self);
			db.release();
		});
	});

	return d.promise;
}