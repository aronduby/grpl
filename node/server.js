<<<<<<< HEAD

var grpl = require('grpl');

/*
grpl.season.getById(1)
.then(function(season){
	console.log(season);
});

grpl.player.getByNameKey('ChadBecker')
.then(function(d){
	console.log(d);
});

grpl.player.getAllForSeason(1)
.then(function(d){
	console.log(d);
})
.fail(function(err){
	console.log(err);
});
*/

// generate tokens via https://developers.facebook.com/tools/explorer
/*
grpl.player.getByFBToken('AAACEdEose0cBAFgctQHC1quoZBPSkdFiWWP2bsX2BEoaK5RwMcVwdCuEZBlw13M3RM035qd3Iz074bYI8rsozZBdNQX0ZANNJ7nwImHz4wZDZD')
.then(function(d){
	console.log('success', d);
	process.exit();
})
.fail(function(err){
	console.log('fail', err);
	process.exit();
});

grpl.leaguenight.getByStarts('2013-02-20')
.then(function(d){
	console.log('success', d);
})
.fail(function(err){
	console.log('fail', err);
});

grpl.leaguenight.getAllForSeason(1)
.then(function(d){
	console.log('success', d);
})
.fail(function(err){
	console.log('fail', err);
});

grpl.leaguenight.getAllForSeason(3)
.then(function(d){
	console.log('success', d);
})
.fail(function(err){
	console.log('fail', err);
});

var season = new grpl.season.Season(2, 'Second Season');
season.save();
if(err){ d.reject(err); db.end(); return false; }
*/

grpl.machine.getByAbbv('SW')
.then(function(d){
	console.log('getByAbbv success', d);
})
.fail(function(err){
	console.log('getByAbbv fail', err);
});

grpl.machine.getForLeagueNight('2013-02-20')
.then(function(d){
	console.log('getForLeagueNight success', d);
})
.fail(function(err){
	console.log('getForLeagueNight fail', err);
});

grpl.machine.getForSeason(1)
.then(function(d){
	console.log('getForSeason success', d);
})
.fail(function(err){
	console.log('getForSeason fail', err);
});

grpl.machine.getPlayedLessThanXTimes(1,2,5)
.then(function(d){
	console.log('getPlayedLessThanXTimes success', d);
})
.fail(function(err){
	console.log('getPlayedLessThanXTimes fail', err);
});