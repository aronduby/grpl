var io = require('socket.io').listen(834,{
		'close timeout': 2700, // 45 minutes to re-open a closed connection
		'browser client minification': true,
		'browser client etag': true,
		'browser client gzip': true
	}),
	https = require('https'),
	Q = require('q'),
	winston = require('winston');


// Setup Winston as our logger
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console,{ colorize: true });
winston.add(winston.transports.File, {
	filename: 'D:/My Documents/website/grpl/logs/all.log',
	name: 'file.all',
	json: false,
	colorize: true,
	handleExceptions: true
});
winston.add(winston.transports.File,{
	filename: 'D:/My Documents/website/grpl/logs/info.log',
	level: 'info',
	name: 'file.info',
	colorize: true
});
winston.add(winston.transports.File,{
	filename: 'D:/My Documents/website/grpl/logs/warn-error.log',
	level: 'warn',
	name: 'file.warn',
	colorize: true
});
io.set('logger', winston);

// MYSQL
var mysql = require('mysql'),
	db_config = {
		host     : 'localhost',
		port     : '3306', 
		user     : 'grpl',
		password : 'phyle7mothy',
		database : 'aronduby_grpl'
	},
	db_connection = mysql.createConnection(db_config);

function handleDisconnect(conn){
	conn.on('error', function(err){
		winston.info('Re-connecting lost connection: ' +err.stack);
		db_connection.destroy();
		db_connection = mysql.createConnection(db_connection.config);
		handleDisconnect(db_connection);
		db_connection.connect();
	});
}
handleDisconnect(db_connection);

var admin_ids = [],
	season_id = 1;
	
var scoring = {
	started: false,
	starts: '',
	logged_in_users: [],
	machines: [],
	groups: [],
	scores: {},

	start: function(starts){
		var d = Q.defer();
		winston.info('starting scoring');
		var self = this;

		this.starts = starts;

		this._getMachines()
		.then(function(){ return self._getGroups() })
		.then(function(){
			self.started = true;
			d.resolve(self.starts);
		})
		.fail(function(err){
			d.reject(err);
		})
		.done();

		return d.promise;
	},

	stop: function(){
		this.started = false;
	},

	update: function(data){

		var d = Q.defer(),
			self = this,
			sets = [],
			resolve_with = data,
			sql = "REPLACE INTO league_night_score (starts, name_key, abbv, points) VALUES ";

		for(name_key in data.players){
			sets.push("('"+self.starts+"', '"+name_key+"', '"+data.abbv+"', '"+data.players[name_key]+"')");
			// add to the scores object
			self.scores[data.abbv][name_key] = data.players[name_key];
		}
		sql += sets.join(', ');
		db_connection.query(sql, function(err, rows){
			if(err){
				d.reject(new Error(err));
			} else {
				d.resolve(resolve_with);
			}
		});

		return d.promise;
	},

	getGroupScoresForMachine: function(abbv, user, starts){
		var d = Q.defer(),
			resolve_with = {
				'abbv': abbv,
				'starts' : starts==undefined ? this.starts : starts,
				'players' : {}
			},
			players = this.getGroupForUser(user),
			name_keys = [],
			sql = "SELECT name_key, points FROM league_night_score WHERE starts = ? AND abbv = ? AND name_key IN (?)";

		for(i in players){
			name_keys.push(players[i].nameKey);
		}
		var q = db_connection.query(sql, [starts==undefined ? this.starts : starts, abbv, name_keys], function(err, rows){
				if(err){
					d.reject(new Error(err));
				} else {
					for(i in rows){
						resolve_with.players[rows[i].name_key] = rows[i].points;
					}
					d.resolve(resolve_with);
				}
		});

		return d.promise;
	},


	getGroupForUser: function(user){
		for(i in this.groups){
			for(j in this.groups[i].players){
				if(this.groups[i].players[j].nameKey == user.name_key){
					return this.groups[i].players;
				}
			}
		}
	},

	_getMachines: function(){
		winston.info('getting machines...');
		var d = Q.defer(),
			self = this,
			sql = "SELECT m.name, m.abbv, m.image, m.note FROM machine_to_league_night mtln LEFT JOIN machine m USING(abbv) WHERE mtln.starts=?";

		db_connection.query(sql, [this.starts], function(err, rows){
			if(err){
				d.reject(new Error(err));
			} else {
				if(rows.length == 0){
					d.reject(new Error('No machines found for that night'));
				} else {
					self.machines = rows;
					for(i in rows)
						self.scores[rows[i].abbv] = {};
					d.resolve(true);					
				}
			}
		});

		return d.promise;
	},

	_getGroups: function(){
		var d = Q.defer(),
			self = this,
			sql = 'SELECT ' +
				'lns.name_key, ' +
				'CONCAT(LEFT(p.first_name,1),LEFT(p.last_name,1)) AS initials, ' +
				'p.first_name, p.last_name, ' +
				'SUM( lns.points ) AS points, ' +
				'COUNT(IF(lns.points=7,1,null)) AS firsts, ' +
				'COUNT(IF(lns.points=5,1,null)) AS seconds, ' +
				'COUNT(IF(lns.points=3,1,null)) AS thirds, ' +
				'COUNT(IF(lns.points=1,1,null)) AS fourths ' +
			'FROM ' +
				'league_night_score lns ' +
			'LEFT JOIN ' +
				'league_night ln USING ( starts ) ' +
			'LEFT JOIN ' +
				'player p USING(name_key) ' +
			 'WHERE ' +
			 	'lns.starts < ? ' +
			 	'AND ln.season_id = ? ' +
			'GROUP BY (lns.name_key) ' +
			'ORDER BY ' +
				'points DESC, ' +
				'firsts DESC, ' +
				'seconds DESC, ' +
				'thirds DESC, ' +
				'fourths DESC';

		var query = db_connection.query(sql, [self.starts, season_id], function(err, rows){
			if(err){
				d.reject(new Error(err));
			} else {
				if(rows.length == 0){
					d.reject(new Error("No players found for that night: <br />" + query.sql));
				} else {
					var group = {
							players: [],
							machines: []
						},
						offset = 0;

					for(i in rows){
						group.players.push({
							nameKey: rows[i].name_key,
							initials: rows[i].initials,
							firstName: rows[i].first_name,
							lastName: rows[i].last_name
						});

						if(group.players.length == 4){
							// add our machines in the proper order to the group
							group.machines = self.machines.slice(offset).concat(self.machines.slice(0,offset));
							self.groups.push(group);
							group = {
								players: [],
								machines: []
							};
							offset++;
						}
					}
					d.resolve(true);
				}
			}
		});

		return d.promise;
	}

}


// SOCKETS
io.sockets.on('connection', function(socket){

	socket.on('disconnect', function(){
		// disconnect actions here, like checking if they were logged in to scoring

		// if they were admin remove them from the array
		admin_index = admin_ids.indexOf(socket.id);
		if(admin_index != -1)
			admin_ids.splice(admin_index, 1);
	});

	
	// loggin in via facebook token
	socket.on('loginFromAccessToken', function(token, fn){
		winston.info('loginFromAccessToken');
		https.get('https://graph.facebook.com/me?fields=id&access_token='+token, function(res) {
			res.on('data', function(d) {
				var obj = JSON.parse(d);
				
				// get the user from the database
				sql = 'SELECT player_id, first_name, last_name, admin, name_key, hash FROM player WHERE facebook_id=?';
				var query = db_connection.query(sql, [obj.id]);
				query.on('error', function(err){
					winston.error('query error', err);
					fn(false);
				})
				.on('result', function(row){
					socket.set('user', row, function(){
						if(row.admin == 1){
							admin_ids.push(socket.id);
						}
						fn(row);
						if(scoring.started == true)
							socket.emit('scoring_started', scoring);
					});
				});
			});

		}).on('error', function(e) {
			winston.error(e);
		});
	});

	socket.on('loginFromHash', function(hash, fn){
		winston.info('loginFromHash');
		
		var sql = "SELECT player_id, first_name, last_name, admin, name_key, hash FROM player WHERE hash=?",
			query = db_connection.query(sql, [hash]);

		query.on('error', function(err){
			winston.error('query error', err);
			fn(false);
		})
		.on('result', function(row){
			socket.set('user', row, function(){
				if(row.admin == 1){
					admin_ids.push(socket.id);
				}
				fn(row);
				if(scoring.started == true)
					socket.emit('scoring_started', scoring);
			});
		});
	});

	socket.on('loginFromForm', function(email, password, fn){
		winston.info('loginFromForm');

		var sql = "SELECT player_id, first_name, last_name, admin, name_key, hash FROM player WHERE email=? AND hash = MD5(CONCAT(name_key,'-',email,'-',?,'-',IFNULL(facebook_id,'')))",
			query = db_connection.query(sql, [email, password]);

		query.on('error', function(err){
			winston.error('query error', err);
			fn(false);
		})
		.on('result', function(row){
			socket.set('user', row, function(){
				if(row.admin == 1){
					admin_ids.push(socket.id);
				}
				fn(row);
				if(scoring.started == true)
					socket.emit('scoring_started', scoring);
			});
		});
	});

	// check if we're already logged in
	socket.on('amILoggedIn', function(fn){
		socket.get('user', function(err, user){
			if(err){
				winston.error(err);
				throw new Error(err);
			} else {
				if(user !== null){
					winston.info('User ' + user.name_key + ' already logged in');
				} else {
					winston.info('User data not found');
				}
				fn(user);
			}
		});
	});

	socket.on('registerUser',function(name_key, first_name, last_name, facebook_id, email, password, fn){
		var sql = "INSERT INTO player SET "+
			"name_key=?, first_name=?, last_name=?, facebook_id=?, email=?,hash=MD5(CONCAT(?,'-',IFNULL(facebook_id,''))) "+
			"ON DUPLICATE KEY UPDATE name_key=VALUES(name_key), first_name=VALUES(first_name), last_name=VALUES(last_name), facebook_id=VALUES(facebook_id), email=VALUES(email), hash=VALUES(hash)";
		var query = db_connection.query(sql, [name_key, first_name, last_name, facebook_id, email, name_key+'-'+email+'-'+password]);
		query.on('error', function(err){
			winston.error('register user query error', err);
			socket.emit('error', err.message);
		})
		.on('result', function(row){
			winston.info('registered user successfully');
			fn(true);
		});
	});

	// trigger to tell the server to prepare for scoring
	// this will then emit the scoring_started event to all of the sockets
	socket.on('startScoring', function(starts){
		socket.get('user', function(err, user){
			if(user.admin != true){
				socket.emit('error', {
					title:'Error',
					headline: 'Nope...',
					msg: '<p>Only Admins can start scoring. If you think you should be an admin talk to the people in charge.</p>',
					btn: false
				});
			} else {				
				scoring.start(starts)
				.then(function(starts){
					io.sockets.emit('scoring_started', scoring);
				})
				.fail(function(err){
					socket.emit('error', err.message);
				})
				.done();
			}
		});
	});

	socket.on('stopScoring', function(){
		socket.get('user', function(err, user){
			if(user.admin != true){
				socket.emit('error', {
					title:'Error',
					headline: 'Nope...',
					msg: '<p>Only Admins can stop scoring. If you think you should be an admin talk to the people in charge.</p>',
					btn: false
				});
			} else {				
				scoring.stop();
				io.sockets.emit('scoring_stopped', scoring);
			}
		});
	});


	socket.on('loginToScoring', function(fn){
		socket.get('user', function(err, user){
			if(err){
				socket.emit('error', err.message);
			} else {
				scoring.logged_in_users.push(user.name_key);
				fn(user);
				socket.emit('scoring_logged_in', user);
			}
		});
	});

	socket.on('scoring_update', function(data, fn){
		scoring.update(data).then(function(data){
			socket.broadcast.emit('scoring_update', data);
			fn(data);
		}).fail(function(err){
			winston.error(err);
			socket.emit('error', err.msg);
		});		
	});

	socket.on('getGroupScoresForMachine', function(abbv, user, fn){
		var d;
		if(user == null){
			socket.get('user', function(err, user){
				if(err){
					socket.emit('error', err.message);
				} else {
					d = scoring.getGroupScoresForMachine(abbv, user);
				}
			});
		} else {
			d = scoring.getGroupScoresForMachine(abbv, user);
		}

		d.then(fn);

		// fn(d);
	});

	socket.on('getMachinesPlayedLessThanXTimes', function(times, limit, fn){
		if(times == undefined)
			times = 2;
		if(limit == undefined)
			limit = 5;

		var sql = "SELECT m.*, COUNT(mtln.abbv) AS played " +
			"FROM machine m " +
			"LEFT JOIN machine_to_league_night mtln USING (abbv) " +
			"LEFT JOIN league_night ln ON(mtln.starts=ln.starts) " +
			"WHERE " +
			"m.season_id=? " +
			"AND ( " +
			    "ln.season_id = ? " +
			    "OR ln.season_id IS NULL " +
			") " +
			"GROUP BY mtln.abbv " +
			"HAVING played < ? " +
			"ORDER BY RAND() " +
			"LIMIT ? ";

		var query = db_connection.query(sql, [season_id, season_id, times, limit]);
		query.on('error', function(err){
			winston.error('get machines played less than x times query error', err);
			socket.emit('error', err.message);
		})
		.on('result', function(row){
			console.log(row);
			// fn(row);
		});

	});



	socket.on('emitError', function(msg){
		socket.emit('error', msg);
	});

	socket.on('echo', function(msg){
		socket.emit('echo', msg);
	});


});