var Q = require('q');

function getPool(){ return module.parent.exports.pool; }

exports.MachineToLeagueNight = MachineToLeagueNight;
function MachineToLeagueNight(night_id, division_id){
	this.night_id = night_id;
	this.division_id = division_id;
	this.machines = {};
}
MachineToLeagueNight.prototype.night_id = null;
MachineToLeagueNight.prototype.division_id = null;
MachineToLeagueNight.prototype.machines = {};
MachineToLeagueNight.prototype.clear = function(){
	this.machines = {};
}
MachineToLeagueNight.prototype.add = function(abbv, display_order){
	this.machines[abbv] = display_order;
}
MachineToLeagueNight.prototype.save = function(){
	var self = this,
		d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var keys = [];

		for(var abbv in self.machines){
			var data = {
				'abbv': abbv,
				'night_id': self.night_id,
				'division_id': self.division_id,
				'display_order': self.machines[abbv]
			};

			keys.push(abbv);

			var query = db.query("INSERT INTO machine_to_league_night SET ? ON DUPLICATE KEY UPDATE ?", [data, data], function(err, result) {
				if(err){ d.reject(err); db.release(); return false; }
			});
			// console.log(query.sql);
		}

		if(keys.length > 0){
			var del_query = db.query("DELETE FROM machine_to_league_night WHERE night_id=? AND division_id=? AND abbv NOT IN (?)", [self.night_id, self.division_id, keys], function(err,result){
				if(err){ d.reject(err); db.release(); return false; }
				db.release();
				d.resolve(true);
			});
		} else {
			db.release();
			d.resolve(true);
		}
	});

	return d.promise;
}


