var Q = require('q');

exports.getAll = function(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT * FROM page", function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var pages = [];
			results.forEach(function(row){
				pages.push(new page(row));
			});
			d.resolve(pages);
			db.release();
		})
	});

	return d.promise;
}

exports.getById = function(id){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT * FROM page WHERE page_id=?", [id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var row = results[0];
			d.resolve(new Page(row));
			db.release();
		})
	});

	return d.promise;
}

exports.getByUrl = function(url){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		db.query("SELECT * FROM page WHERE url=?", [url], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var row = results[0];
			d.resolve(new Page(row));
			db.release();
		})
	});

	return d.promise;
}

function getPool(){ return module.parent.exports.pool; }


// this allows us to create new empty items by saying new grpl.page.Page();
exports.Page = Page;

function Page(opts){
	for(prop in opts){
		if (prop in this) {
			this[prop] = opts[prop];
		}
	}
}
Page.prototype.page_id = null;
Page.prototype.url = null;
Page.prototype.background_image = null;
Page.prototype.button_text = null;
Page.prototype.content = null;

Page.prototype.save = function(){
	var self = this,
		d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }
		var query = db.query("INSERT INTO page SET ? ON DUPLICATE KEY UPDATE ?", [self, self], function(err, result) {
			if(err){ d.reject(err); db.release(); return false; }
			d.resolve(self);
			db.release();
		});
	});

	return d.promise;
}