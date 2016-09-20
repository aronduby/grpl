var grpl          = require('./grpl'),
    https         = require('https'),
    fs            = require('fs'),
    Q             = require('q'),
    auth          = require('./auth.js'),
    redis         = require('redis'),
    redisClient   = redis.createClient(),
    socketioRedis = require('socket.io-redis'),
    settings      = require('../env.json'),
    season_id;

var app = https.createServer({
    key: fs.readFile(settings.ssl.key),
    cert: fs.readFile(settings.ssl.cert),
    ca: fs.readFile(settings.ssl.ca)
});

io = require('socket.io').listen(app, {
    'close timeout': 3600, // 60 minutes to re-open a closed connection
    'browser client minification': true,
    'browser client etag': true,
    'browser client gzip': true
});
io.adapter(socketioRedis({host: 'localhost', port: 6379}));
app.listen(834, "0.0.0.0");


io.use(function (socket, next) {
    var handshakeData = socket.request;
    var cookies = {};

    if (handshakeData.headers.cookie != undefined) {
        handshakeData.headers.cookie && handshakeData.headers.cookie.split(';').forEach(function (cookie) {
            var parts = cookie.split('=');
            cookies[parts.shift().trim()] = ( parts.join('=') || '' ).trim();
        });
    }

    if (cookies.user_hash != undefined) {
        handshakeData.user_hash = cookies.user_hash;
    } else {
        // else set them up with an anonymous hash
        // this way we can keep track of season data
        handshakeData.user_hash = 'ANON' + (+new Date()).toString(36);
    }

    if (cookies.season_id != undefined) {
        socket.season_id = cookies.season_id;
    }

    next();
});


var logger = require('tracer').colorConsole();

// grab the current season_id
grpl.season.getCurrent()
    .then(function (season) {
        season_id = season.season_id
    })
    .fail(function (err) {
        season_id = 8;
    }).done();


function handleError(err) {
    logger.error(err.stack);
    return {
        title: 'Error',
        headline: 'Something Went Wrong',
        msg: '<p>The best thing to do now is screenshot this and send it to Duby.</p><blockquote>' + err.message + '</blockquote>',
        additional_classes: 'error'
    };
};

function isAdmin(socket) {
    return socket.user.admin;
}

function getSeasonID(socket) {
    var ssid = socket.season_id;
    if (ssid == null) {
        ssid = season_id;
    }

    return ssid;
}


io.sockets.on('connection', function (socket) {

    /*
     *	To avoid race conditions where a socket emits before angular is fully ready
     *	start off queueing any emitted events, then emit them when ready is called
     */
    var original_emit = socket.emit,
        queue         = [];

    socket.emit = function () {
        queue.push(arguments);
    };

    socket.on('ready', function () {
        socket.emit = original_emit;
        queue.forEach(function (args) {
            socket.emit.apply(socket, args);
        });
    });

    /*
     * Setup our user hash and copy any data from a previous socket to this one
     */
    if (socket.request.user_hash != undefined) {
        redisClient.getset('uh' + socket.request.user_hash, socket.id, function (err, prev_socket_id) {
            if (prev_socket_id != undefined) {
                // copy the data from the previous id into the new one
                // don't delete because then we'll have issues with multi devices
                redisClient.hgetall(prev_socket_id, function (err, data) {
                    if (data != null)
                        redisClient.hmset(socket.id, data);
                });
            } else {
                // else tell the front-end to save the anonymous cookie
                // do this here because it's the first we'll have the connection
                // but make sure to differentiate between someone who has a legit user_hash but doesn't have a previous socket
                // and the actual anonymous hash otherwise we'll be logging people out with a fake cookie
                if (socket.request.user_hash.substr(0, 4) == 'ANON') {
                    socket.emit('write_cookie', 'user_hash', socket.request.user_hash);
                }
            }
        });
    }

    function logPlayerIn(player, cb) {
        socket.user = {
            name_key: player.name_key,
            admin: !!auth.authorize('admin', player.role)
        };
        redisClient.set('uh' + player.hash, socket.id);

        // remove our anon hash and update the handshake data
        if (socket.request.user_hash.substr(0, 4) == 'ANON') {
            redisClient.del('uh' + socket.handshake.user_hash);
            socket.handshake.user_hash = player.hash;
        }

        cb(null, player);
    }

    /*
     *	LOGIN METHODS
     */
    // cookie hash
    socket.on('user.loginFromHash', function (hash, cb) {
        grpl.player.getByHash(hash)
            .then(function (player) {
                logPlayerIn(player, cb);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    // facebook access token
    socket.on('user.loginFromAccessToken', function (token, cb) {
        grpl.player.getByFBToken(token)
            .then(function (player) {
                logPlayerIn(player, cb);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    // email/password login
    socket.on('user.loginFromForm', function (data, cb) {
        grpl.player.getByEmailAndPassword(data.email, data.password)
            .then(function (player) {
                logPlayerIn(player, cb);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    // registering a user
    socket.on('user.register', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit users. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            grpl.player.register(data, season_id) // always the current season
                .then(function (player) {
                    cb(null, player);
                    io.emit('user_updated', player);
                })
                .fail(function (err) {
                    cb(handleError(err));
                }).done();
        }
    });

    // replacing a user with another
    socket.on('user.replace', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit users. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            grpl.player.replace(data.replace, data.replace_with, season_id) // always the current season
                .then(function (player) {
                    cb(null, player);
                    io.emit('user_replaced', {
                        replace: data.replace,
                        replace_with: player
                    });
                })
                .fail(function (err) {
                    cb(handleError(err));
                }).done();
        }
    });

    /*
     *	TIEBREAKER
     */
    socket.on('tiebreaker', function (data, cb) {
        grpl.scoring.tiebreaker(data)
            .then(function (resolved) {
                cb(null, resolved);
                io.emit('tiesbroken', resolved);
            })
            .fail(function (err) {
                cb(handleError(err));
            });
    });


    /*
     *	SCORING
     */
    socket.on('scoring.emitIfStarted', function () {
        var d = Q.defer();

        grpl.scoring.resolveWithData(d)
            .then(function (data) {
                if (data.started == true) {
                    // only respond to this specific socket
                    // since this is used to check if it's already started
                    socket.emit('scoring_started', data);
                }
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.started', function (cb) {
        grpl.scoring.started()
            .then(function (started) {
                cb(null, started);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.start', function (starts, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can start scoring. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            if (!starts) {
                cb({
                    title: 'Error',
                    headline: 'Missing Required Information',
                    msg: '<p>You must supply a date for the scoring system</p>'
                });
                return false;
            }

            grpl.scoring.start(season_id, starts)
                .then(function (data) {
                    io.emit('scoring_started', data);
                    cb(null, data);
                })
                .fail(function (err) {
                    cb({
                        title: 'Error',
                        headline: 'Something Went Wrong',
                        msg: '<p>The server said:</p><blockquote>' + err.msg + '</blockquote>',
                        additional_classes: 'error'
                    });
                })
                .done();
        }
    });

    socket.on('scoring.stop', function (cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can stop scoring. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            grpl.scoring.stop()
                .then(function (night_id) {
                    grpl.push.send();
                    io.emit('scoring_stopped', night_id);
                    cb(null, true);
                })
                .fail(function (err) {
                    cb(handleError(err));
                })
                .done();
        }
    });

    socket.on('scoring.getMachines', function (cb) {
        grpl.scoring.getMachines()
            .then(function (d) {
                cb(null, d);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.getPlayers', function (cb) {
        grpl.scoring.getPlayers()
            .then(function (d) {
                cb(null, d);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.getDivisions', function (cb) {
        grpl.scoring.getDivisions()
            .then(function (d) {
                cb(null, d);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.getGroupForUser', function (name_key, cb) {
        grpl.scoring.getGroupForUser(name_key)
            .then(function (d) {
                cb(null, d);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('scoring.login', function (cb) {
        var name_key = socket.user.name_key;
        cb(null, name_key);
        socket.emit('scoring_logged_in', name_key);
    });

    socket.on('scoring.update', function (data, cb) {
        grpl.scoring.update(data)
            .then(function (data) {
                io.emit('scoring_update', data);
                if (cb)
                    cb(null, data);
            }).fail(function (err) {
            cb(handleError(err));
        });
    });


    /*
     *	DATA API
     */
    socket.on('changeSeason', function (season_id, cb) {
        socket.season_id = season_id;
        cb(null, season_id);
    });

    socket.on('getSeason', function (cb) {
        var ssid = socket.season_id;
        if (ssid == null)
            ssid = season_id;

        cb(null, {
            'active': parseInt(ssid, 10),
            'current': season_id
        });
    });

    socket.on('seasons.getAll', function (cb) {
        grpl.season.getAll()
            .then(function (seasons) {
                cb(null, seasons);
            }).fail(function (err) {
            cb(handleError(err));
        }).done();
    });

    socket.on('season.update', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit season. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            var season = new grpl.season.Season(data.season_id, data.title, data.scoring_order);
            season.current = data.current == true;
            season.save()
                .then(function () {
                    if (season.current == true)
                        season_id = season.season_id;

                    // save the divisions and then do the division checks
                    var promises = [];
                    data.divisions.forEach(function (dd) {
                        var d = new grpl.division.Division(dd);
                        if (d.season_id == null)
                            d.season_id = season.season_id;

                        promises.push(d.save());
                    });

                    Q.all(promises)
                        .then(function () {
                            grpl.division.checkCapsForSeason(season.season_id)
                                .then(function (r) {
                                    cb(null, r);
                                    io.emit('season_updated', season);
                                })
                                .fail(function (err) {
                                    cb(handleError(err));
                                }).done();

                        })
                        .fail(function (err) {
                            cb(handleError(err));
                        }).done();


                }).fail(function (err) {
                cb(handleError(err));
            }).done();
        }
    });

    // gets all of the league nights for the season, including a totals
    socket.on('leaguenight', function (cb) {
        var ssid = getSeasonID(socket);

        grpl.leaguenight.getAllForSeason(ssid)
            .then(function (nights) {
                var totals = new grpl.leaguenight.LeagueNight({
                    'season_id': ssid,
                    starts: 'totals',
                    night_id: 'totals',
                    title: 'Totals to Date',
                    note: ''
                });
                nights.unshift(totals);
                cb(null, nights);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    // people who are tied
    socket.on('leaguenight.ties', function (starts, cb) {
        var ssid = getSeasonID(socket);

        grpl.playerlist.getTies(ssid, starts)
            .then(function (ties) {
                cb(null, ties);
            }).fail(function (err) {
            cb(handleError(err));
        }).done();

    });

    socket.on('leaguenight.totals', function (cb) {
        var ssid = getSeasonID(socket);

        grpl.division.getForSeason(ssid)
            .then(function (divisions) {
                var night = new grpl.leaguenight.LeagueNight({
                    starts: 'totals',
                    night_id: 'totals',
                    title: 'Totals to Date',
                    note: '',
                    divisions: divisions
                });
                cb(null, night);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    // information for a specific league night
    socket.on('leaguenight.starts', function (starts, cb) {
        var ssid = getSeasonID(socket);

        grpl.leaguenight.getByStarts(starts)
            .then(function (night) {
                var future_night = (new Date(night.starts).getTime() >= new Date().getTime());

                grpl.division.getPointsForNight(ssid, starts, future_night)
                    .then(function (divisions) {
                        night.divisions = divisions;
                        cb(null, night);
                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    })
                    .done();

            })
            .fail(function (err) {
                cb(err);
            })
            .done();
    });

    socket.on('leaguenight.order', function (starts, cb) {
        var ssid = getSeasonID(socket);

        grpl.playerlist.getOrderForNight(ssid, starts)
            .then(function (order) {

                cb(null, order);

            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('leaguenight.update', function (data, cb) {
        admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit league nights. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            var start_str = data.starts.year + '-' + ('0' + data.starts.month).slice(-2) + '-' + ('0' + data.starts.day).slice(-2);
            d = new Date(data.starts.year, data.starts.month - 1, data.starts.day),
                night = null;

            data.starts = start_str;
            night = new grpl.leaguenight.LeagueNight(data);
            night.save()
                .then(function (night) {
                    var defers = [];

                    // only update the machines if it's a night in the future
                    var today = new Date();
                    today.setHours(0);
                    today.setMinutes(0);
                    today.setSeconds(0);
                    today.setMilliseconds(0);
                    if (today <= d) {
                        for (var i in data.divisions) {
                            var div  = data.divisions[i],
                                mtln = new grpl.machinetoleaguenight.MachineToLeagueNight(night.night_id, div.division_id);

                            for (var display_order in div.machines) {
                                var abbv = div.machines[display_order];
                                if (abbv != '') {
                                    mtln.add(abbv, display_order);
                                }
                            }
                            defers.push(mtln.save());
                        }
                    }

                    // update the subs
                    var sublist = new grpl.playersublist.PlayerSubList(night.night_id);
                    for (var i in data.subs) {
                        sublist.add(data.subs[i]);
                    }
                    defers.push(sublist.save());


                    Q.all(defers)
                        .then(function () {
                            cb(null, night);
                            // send the event to everyone, including the person who sent it
                            io.emit('leaguenight_updated', night);

                        }).fail(function (err) {
                        cb(handleError(err));
                    }).done();

                }).fail(function (err) {
                cb(handleError(err));
            }).done();
        }
    });

    socket.on('leaguenight.update.order', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit league nights. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            var today = new Date();
            today.setHours(0);
            today.setMinutes(0);
            today.setSeconds(0);
            today.setMilliseconds(0);

            var nd = new Date(data.starts + ' 0:0:0');
            //nd.setHours(0);
            //nd.setMinutes(0);
            //nd.setSeconds(0);
            //nd.setMilliseconds(0);

            if (nd < today) {
                cb({
                    title: 'Error',
                    headline: 'Nope...',
                    msg: '<p>You can\'t edit the start order of a night that already happened</p>'
                });
            } else {
                grpl.leaguenight.getByStarts(data.starts)
                    .then(function (night) {

                        data.night_id = night.night_id;

                        night.saveOrder(data)
                            .then(function (order) {
                                cb(null, true);
                                io.emit('leaguenight_order_updated', night);
                            })
                            .fail(function (err) {
                                cb(handleError(err));
                            }).done();

                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    }).done();
            }
        }
    });

    socket.on('leaguenight.scores', function (starts, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit scores. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            grpl.leaguenight.getByStarts(starts)
                .then(function (night) {
                    night.getScores()
                        .then(function (data) {
                            cb(null, data);
                        }).fail(function (err) {
                        cb(err);
                    }).done();
                }).fail(function (err) {
                cb(err);
            }).done();
        }
    });


    socket.on('scores.update', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit scores. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            if (!data.scores.length && !data.delete.mtln && !data.delete.scores) {
                cb({
                    title: 'Error',
                    headline: 'Missing Required Information',
                    msg: '<p>Nothing was submitted. Please try again.</p>'
                });
                return false;
            }

            // first get the league night for the night_id
            grpl.leaguenight.getByStarts(data.starts)
                .then(function (night) {

                    night.saveScores(data)
                        .then(function (result) {

                            cb(null, result);

                            // send the socket event to update the scores
                            io.emit('scores_edited', data);
                        })
                        .fail(function (err) {
                            cb(handleError(err));
                        });

                }).fail(function (err) {
                cb(handleError(err));
            });
        }
    });


    socket.on('playerlist.createStartOrderForNight', function (starts, cb) {
        var ssid = getSeasonID(socket);

        grpl.playerlist.createStartOrderForNight(ssid, starts)
            .then(function (order) {

                grpl.leaguenight.getByStarts(starts)
                    .then(function (night) {
                        var data = {
                            order: order,
                            season_id: night.season_id,
                            night_id: night.night_id
                        };
                        night.saveOrder(data)
                            .then(function () {
                                cb(null, true);
                            })
                            .fail(function (err) {
                                cb(handleError(err));
                            }).done();
                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    }).done();

            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });


    socket.on('division.getForSeason', function (season_id, cb) {
        grpl.division.getForSeason(season_id, true)
            .then(function (divisions) {
                cb(null, divisions);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('division.getForSeasonNoPlayers', function (season_id, cb) {
        grpl.division.getForSeasonNoPlayers(season_id)
            .then(function (divisions) {
                cb(null, divisions);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('division.checkCapsForSeason', function (season_id, cb) {
        grpl.division.checkCapsForSeason(season_id)
            .then(function (data) {
                cb(null, data);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });


    socket.on('machine', function (season_id, cb) {
        var ssid = getSeasonID(socket);

        grpl.machine.getForSeason(ssid)
            .then(function (machines) {
                cb(null, machines);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('machine.all', function (cb) {
        grpl.machine.getAll()
            .then(function (machines) {
                cb(null, machines);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('machine.active', function (cb) {
        grpl.machine.getActive()
            .then(function (machines) {
                cb(null, machines);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('machine.abbv', function (abbv, cb) {
        grpl.machine.getByAbbv(abbv)
            .then(function (machine) {
                cb(null, machine);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('machine.update', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit machines. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            var http = require('https'),
                fs   = require('fs'),
                d    = Q.defer();

            var download = function (url, dest, success, error) {
                var file = fs.createWriteStream(dest);

                var request = http.get(url, function (response) {
                    response.pipe(file);
                    file.on('finish', function () {
                        file.close(success);
                    });
                }).on('error', function (err) { // Handle errors
                    fs.unlink(dest); // Delete the file async. (But we don't check the result)
                    error(err);
                });
            };

            if (data.new_image.length) {
                var u = 'layout_imgs/machines/' + data.abbv + '.jpg';
                download(
                    data.new_image,
                    '/web/grpl/app/dist/' + u,
                    function () {
                        d.resolve(u);
                    },
                    function (err) {
                        d.reject(err);
                    }
                );
            } else {
                d.resolve(data.image);
            }

            d.promise.then(function (image) {
                data.image = image;
                var m = new grpl.machine.Machine(data);

                m.save().then(function (m) {
                    cb(null, m);
                    io.emit('machine_updated', m);
                })
                    .fail(function (err) {
                        cb(handleError(err));
                    }).done();

            })
                .fail(function (err) {
                    cb(handleError(err));
                }).done();


        }
    });

    socket.on('players', function (cb) {
        var ssid = getSeasonID(socket);

        grpl.playerlist.getForSeason(ssid)
            .then(function (playerlist) {
                cb(null, playerlist.players);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('players.active', function (cb) {
        grpl.playerlist.getActive(season_id)
            .then(function (playerlist) {
                cb(null, playerlist.players);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('players.all', function (cb) {
        grpl.playerlist.getAll(season_id)
            .then(function (playerlist) {
                cb(null, playerlist.players);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('players.all.namekey', function (name_key, cb) {
        grpl.player.getByNameKey(name_key)
            .then(function (player) {
                cb(null, player);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('players.namekey', function (name_key, cb) {
        var ssid = getSeasonID(socket);
        var data = {};

        grpl.playerlist.getRankings(ssid)
            .then(function (list) {
                var player   = list.getPlayer(name_key),
                    promises = [];

                data.player = player;
                data.place = player.place;
                data.total_points = player.score;

                Q.all([player.getNightTotals(ssid), player.getMachinePoints(ssid), player.getNightPlace(ssid), player.getMachinePicks(ssid)])
                    .spread(function (nights, machines, places, machine_picks) {
                        data.nights = nights;
                        data.machines = machines;
                        data.places = places;
                        data.machine_picks = machine_picks;

                        cb(null, data);

                    }).fail(function (err) {
                    cb(handleError(err));
                }).done();

            }).fail(function (err) {
            cb(handleError(err));
        }).done();
    });

    socket.on('players.namekey.saveIFPAID', function (data, cb) {
        grpl.player.getByNameKey(data.name_key)
            .then(function (player) {
                player.ifpa_id = data.ifpa_id;
                player.save()
                    .then(function (data) {
                        cb(null, data);
                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    })
                    .done();
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('players.getSeasons', function (name_key, cb) {
        grpl.player.getSeasonsForNameKey(name_key)
            .then(function (season_ids) {
                cb(null, season_ids);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });


    socket.on('players.headToHead', function (name_key, cb) {
        var ssid = getSeasonID(socket);
        var data = {};

        grpl.player.getByNameKey(name_key)
            .then(function (player) {
                player.getHeadToHead(ssid)
                    .then(function (data) {
                        cb(null, data);
                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    }).done();

            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('players.headToHeadAllTime', function (name_key, cb) {
        grpl.player.getByNameKey(name_key)
            .then(function (player) {

                player.getHeadToHead()
                    .then(function (data) {
                        cb(null, data);
                    })
                    .fail(function (err) {
                        cb(handleError(err));
                    }).done();

            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('changelog', function (cb) {
        grpl.changelog.get()
            .then(function (data) {
                cb(null, data);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });


    socket.on('pages.getAll', function (cb) {
        grpl.page.getAll()
            .then(function (pages) {
                cb(null, pages);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('page.url', function (url, cb) {
        grpl.page.getByUrl(url)
            .then(function (page) {
                cb(null, page);
            })
            .fail(function (err) {
                cb(handleError(err));
            })
            .done();
    });

    socket.on('page.update', function (data, cb) {
        var admin = isAdmin(socket);
        if (admin != true && admin != 'true') {
            cb({
                title: 'Error',
                headline: 'Nope...',
                msg: '<p>Only Admins can edit pages. If you think you should be an admin talk to the people in charge.</p>'
            });
        } else {
            var p = new grpl.page.Page(data);

            p.save().then(function (p) {
                cb(null, p);
                io.emit('page_updated', p);
            })
                .fail(function (err) {
                    cb(handleError(err));
                }).done();
        }
    });


    /*
     *	Push Notifications via GCM
     */
    socket.on('push.subscribe', function (endpoint, cb) {
        grpl.push.subscribe(endpoint)
            .then(function (registration_id) {
                cb(null, registration_id);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('push.unsubscribe', function (endpoint, cb) {
        grpl.push.unsubscribe(endpoint)
            .then(function (registration_id) {
                cb(null, registration_id);
            })
            .fail(function (err) {
                cb(handleError(err));
            }).done();
    });

    socket.on('push.send', function (dry_run, cb) {
        grpl.push.send(dry_run);
    })


    /*
     *	Random Utility Functions
     */
    socket.on('echo', function (str) {
        logger.log(str);
    });

});// end connect


/*
 *	Add a server for separate api call for randomizer
 */
var server = require('http').createServer(),
    url    = require('url');

server.on('request', function (req, res) {
    var uri            = url.parse(req.url, true),
        client_updated = uri.query.t == undefined ? new Date(0) : new Date(Number(uri.query.t));

    switch (uri.pathname) {
        case '/randomizer/update':
            grpl.machine.getLastUpdated()
                .then(function (server_updated) {
                    if (client_updated > server_updated) {
                        res.writeHead(304);
                        res.end();
                    } else {
                        grpl.machine.getActive()
                            .then(function (machines) {
                                res.writeHead(200, {"Content-Type": "application/json"});
                                res.write(JSON.stringify(machines));
                                res.end();
                            })
                            .fail(function (err) {
                                res.writeHead(500, {"Content-Type": "application/json"});
                                res.write(JSON.stringify(err));
                                res.end();
                            }).done();
                    }
                })
                .fail(function (err) {
                    res.writeHead(500, {"Content-Type": "application/json"});
                    res.write(JSON.stringify(err));
                    res.end();
                }).done();
            break;
        default:
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.write("404 Not Found\n");
            res.end();
            break;
    }
});

server.listen(835);

// }