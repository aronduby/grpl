var Q = require('q');

/*
 *	Controller Functions
*/
exports.getForSeason = function(season_id){
	var all_done = Q.defer(),
		division_load = loadDivisions(season_id),
		player_list_load = module.parent.exports.playerlist.getRankings(season_id);

	// Once they're both done, setup the divisions
	Q.all([division_load, player_list_load])
	.spread(function(divisions, player_list){

		divisions = splitListIntoDivisions(divisions, player_list);
		divisions.forEach(function(div){
			div.machines_note = 'no machines for totals';
			div.machines = [];
		});	

		all_done.resolve(divisions);
	})
	.fail(function(err){
		all_done.reject(err);
	}).done();

	return all_done.promise;
};

exports.getBasicDataForSeason = function(season_id){
	return loadDivisions(season_id);
}

exports.getForSeasonNoPlayers = function(season_id){
	return loadDivisions(season_id);
};

exports.getPointsForNight = function(season_id, starts, future_night){
	var all_done = Q.defer(),
		division_load = loadDivisions(season_id),
		player_list_load = null;

	if(future_night == false || future_night == undefined){
		player_list_load = module.parent.exports.playerlist.getPointsForNight(season_id, starts);
	} else {
		player_list_load = module.parent.exports.playerlist.getOrderForNight(season_id, starts);
	}

	// Once they're both done, setup the divisions
	Q.all([division_load, player_list_load])
	.spread(function(divisions, player_list){
		divisions = splitListIntoDivisions(divisions, player_list);

		var defereds = [];
		divisions.forEach(function(d){
			// make sure everyone has the proper machines for their division
			var promise = d.loadMachinesForNight(starts);
			
			// TODO  - make this not such a shitty hack
			if(season_id < 6){
				promise.then(function(machines){
					if(future_night == false || future_night ==  undefined){
						// make sure everyone has the same copy of the machines
						var default_machines = {};
						machines.forEach(function(m){
							default_machines[m.abbv] = '';
						});
						d.player_list.players.forEach(function(p){
							p.machines = extend(default_machines, p.machines);
						});
					}
				}).done();
			}
			
			defereds.push( promise );
		});

		Q.all(defereds)
		.then(function(){
			all_done.resolve(divisions);
		})
		.fail(function(err){
			all_done.reject(err);
		}).done();
		
	})
	.fail(function(err){
		all_done.reject(err);
	}).done();

	return all_done.promise;

};

exports.checkCapsForSeason = function(season_id){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT " +
				"SUM(cap IS NULL) > 0 AS no_caps, " +
				"SUM(cap) AS total_cap, " +
				"( SELECT COUNT(*) FROM player_to_season p WHERE season_id = d.season_id) AS total_players " +
			"FROM " +
    			"division d " +
			"WHERE " +
    			"season_id = ? " +
			"GROUP BY " +
    			"d.season_id";

    	db.query(sql, [season_id], function(err, r){
    		if(err){ d.reject(err); db.release(); return false; }
    		
    		r = r[0];    		
    		if(r['no_caps'] == 1 || r['total_cap'] >= r['total_players']){
    			d.resolve(r);
    		} else {
    			d.reject({
    				title: 'Too many players',
    				headline: 'Too many players',
    				msg: 'You currently have to many players and not enough spots in the divisions for this season. <strong>Your changes have been saved but you need to update the divisions</strong>',
					data: r    				
    			});
    		}

    		db.release();
    	});
	});

	return d.promise;
};


function loadDivisions(season_id){
	var d = Q.defer();

	// Load the Divisions for the Season
	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var sql = "SELECT * FROM division WHERE season_id = ? ORDER BY display_order";
		db.query(sql, [season_id], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }
			
			if(results.length == 0){
				d.reject(new Error("No divisions found for that season"));
			} else {
				var divisions = [];
				results.forEach(function(row){
					divisions.push( new Division(row) );
				});
				d.resolve(divisions);
			}

			db.release();
		});
	});

	return d.promise;
}

function splitListIntoDivisions(divisions, player_list){
	// first split the player list into different groups
	var groups = [],
        group = [],
        cur_group = player_list.players.length ? player_list.players[0].grouping : 0;

    for(var i = 0; i < player_list.players.length; ++i){
    	var p = player_list.players[i];

        if(cur_group != p.grouping){
            groups.push(group);
            group = [];
            cur_group = p.grouping;
        }
        group.push( p );
    }
    groups.push(group);

	var split_amongst = [];
	divisions.forEach(function(div){
		if(div.cap){
			div.player_list = new module.parent.exports.playerlist.PlayerList();

			var these_groups = groups.splice(0, div.cap);			
			these_groups.forEach(function(group){
				group.forEach(function(player){
					div.player_list.add(player);
				});
			});
		} else {
			split_amongst.push( div );
		}
	});

	var groups_left = groups.length,
		number_to_add = Math.ceil(groups_left / split_amongst.length);

	split_amongst.forEach(function(d){
		d.player_list = new module.parent.exports.playerlist.PlayerList();

		var these_groups = groups.splice(0, number_to_add);
		these_groups.forEach(function(group){
			group.forEach(function(player){
				d.player_list.add(player);
			});
		});
	});

	return divisions;
}

function getPool(){ return module.parent.exports.pool; }

function extend() {
    var i, json,
        jsons = [];
    for ( i = 0; i < arguments.length; i++ ) {
        json = JSON.stringify( arguments[ i ] ).replace( /^{/, "" ).replace( /}$/, "" );
        if ( json ) {
            jsons.push( json );
        }
   }
    return JSON.parse( "{" + jsons.join( "," ) + "}" );
};

/*
 *	Actual Object
*/
exports.Division = Division;
function Division(opts){
	for(prop in opts){
		if (prop in this) {
			this[prop] = opts[prop];
		}
	}
	this.clear();

	this.machines = [];
}


Division.prototype.division_id = null;
Division.prototype.season_id = null;
Division.prototype.title = null;
Division.prototype.cap = null;
Division.prototype.display_order = null;
Division.prototype.player_list = null;
Division.prototype.machines = [];
Division.prototype.machines_note = null;

Division.prototype.clear = function(){
	this.player_list = null;
}

Division.prototype.loadMachinesForNight = function(starts){
	var self = this,
		d = Q.defer();

	module.parent.exports.machine.getForLeagueNightAndDivision(starts, self.division_id)
	.then(function(machines){
		self.machines = machines;
		d.resolve(machines);
	})
	.fail(function(err){
		console.log(err);
		d.reject(err);
	}).done();

	return d.promise;

}

Division.prototype.save = function(){
    var self = this,
        d = Q.defer();

    getPool().getConnection(function(err, db){
        if(err){ d.reject(err); return false; }

        var fields = {
            division_id: self.division_id,
            season_id: self.season_id,
            title: self.title,
            cap: self.cap,
            display_order: self.display_order
        };

        db.query("INSERT INTO division SET ? ON DUPLICATE KEY UPDATE ?", [fields, fields], function(err, result) {
            if(err){ d.reject(err); db.release(); return false; }
            
            d.resolve(true);

            db.release();
        });
    });

    return d.promise;
}