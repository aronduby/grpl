var Q = require('q');

function getPool(){ return module.parent.exports.pool; }

exports.get = function(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }
		db.query("SELECT * FROM changelog ORDER BY pushed DESC, committed DESC", function(err, results){
			if(err){ d.reject(err); return false; }
			d.resolve(results);
			db.release();
		});
	});

	return d.promise;
}