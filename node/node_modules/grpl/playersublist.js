var Q = require('q');

function getPool(){ return module.parent.exports.pool; }

exports.PlayerSubList = PlayerSubList;
function PlayerSubList(night_id){
	this.night_id = night_id;
	this.subs = [];
}
PlayerSubList.prototype.night_id = null;
PlayerSubList.prototype.subs = [];
PlayerSubList.prototype.clear = function(){
	this.subs = [];
}
PlayerSubList.prototype.add = function(data){
	this.subs.push( data );
}
PlayerSubList.prototype.save = function(){

	var func = function(self){
		var	d = Q.defer(),
			query_defers = [];

		getPool().getConnection(function(err, db){
			if(err){ d.reject(err); return false; }

			var ids = [],
				params = [self.night_id];

			for(var i in self.subs){
				if(isNaN(self.subs[i]))
					self.subs[i] == null
				else
					ids.push(self.subs[i])
			}

			var sql = "DELETE FROM league_night_sub WHERE night_id=? ";
			if(ids.length > 0){
				sql += "AND sub_id NOT IN (?)";
				params.push( ids );
			}

			var del_query = db.query(sql, params, function(err, r){
				if(err){ d.reject(err); db.release(); return false; }

				for(var i in self.subs){
					var data = self.subs[i],
						qd = Q.defer();

					data.night_id = self.night_id;
					query_defers.push(qd);

					var query = db.query("INSERT INTO league_night_sub SET ? ON DUPLICATE KEY UPDATE ?", [data, data], function(err, result) {
						if(err){ qd.reject(err); return false; }

						qd.resolve(true);
					});
					// console.log(query.sql);
				}
			});
			// console.log(del_query.sql);

			Q.all(query_defers)
			.then(function(){
				d.resolve(true);
			})
			.fail(function(err){
				d.reject(err);
			})
			.done(function(){
				db.release();
			});
			
		});

		return d.promise;
	}

	return func(this);
}


