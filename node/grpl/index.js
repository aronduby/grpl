
/*
 *	Setup our mysql server and connection pool
*/
var mysql = require('mysql'),
	pool = mysql.createPool({
		host     : 'localhost',
		port     : '3306', 
		user     : 'grpl',
		password : 'phyle7mothy',
		database : 'grpl'
	});

// allow access to the pool so child modules can access via module.parent.exports.pool
exports.pool = pool;


//	Seasons
exports.season = require('./season');

// Players
exports.player = require('./player');

// League Nights
exports.leaguenight = require('./leaguenight');

// Machine
exports.machine = require('./machine');

// Scoring
exports.scoring = require('./scoring');

// PlayerList
exports.playerlist = require('./playerlist');

// Division
exports.division = require('./division');

// MachineToLeagueNight
exports.machinetoleaguenight = require('./machinetoleaguenight');

// PlayerSubList
exports.playersublist = require('./playersublist');

// changelog
exports.changelog = require('./changelog');

// Page Content
exports.page = require('./page');

// Push Notifications
exports.push = require('./push');