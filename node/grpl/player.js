var Q = require('q');

/*
 *	Controller Functions
 */
exports.getByNameKey = function (name_key) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        db.query("SELECT * FROM player WHERE name_key=?", [name_key], function (err, results) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            if (results[0] == undefined) {
                d.reject(new Error('count find find user with that name key'));
            } else {
                d.resolve(new Player(results[0]));
            }
            db.release();
        });
    });

    return d.promise;
};

exports.getByFBToken = function (token) {
    var https = require('https'),
        d     = Q.defer();

    https.get('https://graph.facebook.com/me?fields=id&access_token=' + token, function (res) {
        res.on('data', function (data) {
            var fb_id = JSON.parse(data).id;
            exports.getByFBID(fb_id)
                .then(function (player) {
                    d.resolve(player);
                })
                .fail(function (err) {
                    d.reject(err);
                });
        });
    }).on('error', function (e) {
        d.reject(e);
    });

    return d.promise;
}


exports.getByFBID = function (fb_id) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        db.query("SELECT * FROM player WHERE facebook_id=?", [fb_id], function (err, results) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            if (results.length == 0) {
                d.reject(new Error('could not find user with that ID'));
                db.release();
                return false;
            }
            d.resolve(new Player(results[0]));
            db.release();
        });
    });

    return d.promise;
}

exports.getByHash = function (hash) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }
        db.query("SELECT * FROM player WHERE hash=?", [hash], function (err, results) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            if (results.length > 0)
                d.resolve(new Player(results[0]));
            else
                d.reject('no player found');
            db.release();
        });
    });

    return d.promise;
}

exports.getByEmailAndPassword = function (email, password) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        db.query("SELECT * FROM player WHERE email=? AND hash = MD5(CONCAT(name_key,'-',email,'-',?,'-',IFNULL(facebook_id,'')))", [email, password], function (err, results) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            if (results.length == 0) {
                d.reject('player not found');
            } else {
                d.resolve(new Player(results[0]));
            }

            db.release();
        });
    });

    return d.promise;
}

/*
 *	Takes a player and saves the email/password needed to be able to login
 */
exports.register = function (data, season_id) {
    var d = Q.defer();

    if (!data.name_key) {
        data.name_key = data.first_name + data.last_name;
    }

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }
        var sql = "INSERT INTO player SET " +
            "name_key=?, first_name=?, last_name=?, facebook_id=?, email=?, hash=MD5(CONCAT(?,'-',IFNULL(facebook_id,''))) " +
            "ON DUPLICATE KEY UPDATE name_key=VALUES(name_key), first_name=VALUES(first_name), last_name=VALUES(last_name), facebook_id=VALUES(facebook_id), email=VALUES(email), hash=VALUES(hash)";

        db.query(sql, [data.name_key, data.first_name, data.last_name, data.facebook_id, data.email, data.name_key + '-' + data.email + '-' + data.password], function (err, results) {
            if (err) {
                err.sql = sql;
                err.data = data;
                d.reject(err);
                return false;
            }

            // save the seasons then resolve
            sql = "DELETE FROM player_to_season WHERE name_key=?";
            db.query(sql, [data.name_key], function (err, r) {
                if (err) {
                    err.sql = sql;
                    d.reject(err);
                    db.release();
                    return false;
                }

                if (data.seasons.length) {
                    var sql  = "INSERT INTO player_to_season (name_key, season_id) VALUES ",
                        sets = [];
                    for (i in data.seasons) {
                        sets.push("('" + data.name_key + "', " + data.seasons[i] + ")");
                    }
                    sql += sets.join(', ');

                    db.query(sql, function (err, r) {
                        if (err) {
                            err.sql = sql;
                            d.reject(err);
                            db.release();
                            return false;
                        }
                        data.active = data.seasons.indexOf(season_id) >= 0 ? true : false;
                        d.resolve(new Player(data));
                        db.release();
                    });
                } else {
                    data.active = false;
                    d.resolve(new Player(data));
                    db.release();
                }
            });
        });
    });

    return d.promise;
};

/*
 *	Adds a player from the night order screen
 */
exports.quickAdd = function (data, season_id) {
    var d = Q.defer();

    if (!data.name_key) {
        data.name_key = data.first_name + data.last_name;
    }

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }
        var sql = "INSERT INTO player SET " +
            "name_key=?, first_name=?, last_name=?, facebook_id=?, email=?, hash=MD5(CONCAT(?,'-',IFNULL(facebook_id,''))) " +
            "ON DUPLICATE KEY UPDATE name_key=VALUES(name_key), first_name=VALUES(first_name), last_name=VALUES(last_name), facebook_id=VALUES(facebook_id), email=VALUES(email), hash=VALUES(hash)";

        db.query(sql, [data.name_key, data.first_name, data.last_name, data.facebook_id, data.email, data.name_key + '-' + data.email + '-' + data.password], function (err, results) {
            if (err) { err.sql = sql; d.reject(err); db.release(); return false; }

            var sql = "INSERT INTO player_to_season (name_key, season_id) VALUES (?, ?)";
            db.query(sql, [data.name_key, season_id], function (err, r) {
                if (err) { err.sql = sql; d.reject(err); db.release(); return false; }

                // add the player as DNP to any scored nights for the season
                var sql = "SELECT DISTINCT night_id FROM grpl.league_night_score WHERE night_id IN (SELECT night_id FROM league_night WHERE season_id = ?)";
                db.query(sql, [season_id], function (err, nightIds) {
                    if (err) { err.sql = sql; d.reject(err); db.release(); return false; }

                    if (!nightIds.length) {
                        data.active = true;
                        d.resolve(new Player(data));
                        db.release();
                        return;
                    }

                    var orderInserts = [];
                    var scoringInserts = [];
                    nightIds.forEach(function (row) {
                        orderInserts.push([
                            row.night_id, // night_id
                            data.name_key, // name_key
                            0, // rank
                            999, //start_order
                            true // dnp
                        ]);

                        scoringInserts.push([
                            row.night_id, // night_id
                            data.name_key, // name_key
                            'DNP', // machine abbv
                            0, // points
                            0 // played_order
                        ]);
                    });

                    var sql = "INSERT INTO league_night_order (night_id, name_key, rank, start_order, dnp) VALUES ?";
                    db.query(sql, [orderInserts], function (err, results) {
                        if (err) { err.sql = sql; d.reject(err); db.release(); return false; }

                        var sql = "INSERT INTO league_night_score (night_id, name_key, abbv, points, played_order) VALUES ?";
                        db.query(sql, [scoringInserts], function (err, results) {
                            if (err) { err.sql = sql; d.reject(err); db.release(); return false; }

                            data.active = true;
                            d.resolve(new Player(data));
                            db.release();
                        });
                    });
                });
            });
        });
    });

    return d.promise;
};

/*
 * Batch activation
 */
exports.batchActivation = function (nameKeys, seasonId) {
    // delete everyone from player to season with seasonID to catch setting people to inactive
    // insert everyone in nameKeys into pts with seasonId
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var deleteSql = "DELETE FROM player_to_season WHERE season_id = ?";
        db.query(deleteSql, [seasonId], function (err, results) {
            if (err) {
                err.sql = deleteSql;
                err.data = nameKeys;
                d.reject(err);
                db.release();
                return false;
            }

            var insertSql = "INSERT INTO player_to_season (name_key, season_id) VALUES ";
            var sets = [];

            nameKeys.forEach(function (key) {
                sets.push('(\'' + key + '\', ' + seasonId + ')');
            });

            if (!sets.length) {
                d.resolve(true);
                db.release();
                return;
            }

            insertSql += sets.join(', ');

            db.query(insertSql, function (err, results) {
                if (err) {
                    err.sql = insertSql;
                    err.data = nameKeys;
                    d.reject(err);
                    db.release();
                    return false;
                }

                d.resolve(true);
                db.release();
            });
        });
    });

    return d.promise;
};

/*
 *	Replaces an active player with someone else
 */
exports.replace = function (replace, replace_with, season_id) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var promises = [];

        // remove the replaced user from the season
        var removed_from_season = Q.promise(function (resolve, reject, notify) {
            var sql = "DELETE FROM player_to_season WHERE name_key = ? AND season_id = ?";
            db.query(sql, [replace, season_id], function (err, results) {
                if (err) {
                    err.sql = sql;
                    reject(err);
                    return false;
                }
                resolve(results);
            });
        });
        promises.push(removed_from_season);

        // get all of the night ids for the season
        var get_night_ids = Q.promise(function (resolve, reject, notify) {
            var sql = "SELECT night_id FROM league_night WHERE season_id = ?";
            db.query(sql, [season_id], function (err, results) {
                if (err) {
                    err.sql = sql;
                    reject(err);
                    return false;
                }

                var night_ids = [];
                results.forEach(function (row) {
                    night_ids.push(row.night_id);
                });
                resolve(night_ids);
            })
        });
        promises.push(get_night_ids);

        // update the order for the nights
        var order = Q.promise(function (resolve, reject, notify) {
            get_night_ids.then(function (night_ids) {
                var sql = "UPDATE league_night_order SET name_key = ? WHERE name_key = ? AND night_id IN( ? )";
                db.query(sql, [replace_with, replace, night_ids], function (err, results) {
                    if (err) {
                        err.sql = sql;
                        reject(err);
                        return false;
                    }
                    resolve(results);
                });
            }).fail(function (err) {
                reject(err);
            }).done();
        });
        promises.push(order);

        // update the scores for the nights
        var scores = Q.promise(function (resolve, reject, notify) {
            get_night_ids.then(function (night_ids) {
                var sql = "UPDATE league_night_score SET name_key = ? WHERE name_key = ? AND night_id IN( ? )";
                db.query(sql, [replace_with, replace, night_ids], function (err, results) {
                    if (err) {
                        err.sql = sql;
                        reject(err);
                        return false;
                    }
                    resolve(results);
                });
            }).fail(function (err) {
                reject(err);
            }).done();
        });
        promises.push(scores);

        // update the subs for the nights
        var subs = Q.promise(function (resolve, reject, notify) {
            get_night_ids.then(function (night_ids) {
                var sql = "UPDATE league_night_sub SET name_key = ? WHERE name_key = ? AND night_id IN( ? )";
                db.query(sql, [replace_with, replace, night_ids], function (err, results) {
                    if (err) {
                        err.sql = sql;
                        reject(err);
                        return false;
                    }
                    resolve(results);
                });
            }).fail(function (err) {
                reject(err);
            }).done();
        });
        promises.push(subs);

        // update the machine picks for the nights
        var machine_picks = Q.promise(function (resolve, reject, notify) {
            get_night_ids.then(function (night_ids) {
                var sql = "UPDATE machine_to_league_night SET picked_by = ? WHERE picked_by = ? AND night_id IN( ? )";
                db.query(sql, [replace_with, replace, night_ids], function (err, results) {
                    if (err) {
                        err.sql = sql;
                        reject(err);
                        return false;
                    }
                    resolve(results);
                });
            }).fail(function (err) {
                reject(err);
            }).done();
        });
        promises.push(machine_picks);

        // update the tiebreakers for the nights
        var tie_breakers = Q.promise(function (resolve, reject, notify) {
            get_night_ids.then(function (night_ids) {
                var sql = "UPDATE tie_breaker SET name_key = ? WHERE name_key = ? AND night_id IN( ? )";
                db.query(sql, [replace_with, replace, night_ids], function (err, results) {
                    if (err) {
                        err.sql = sql;
                        reject(err);
                        return false;
                    }
                    resolve(results);
                });
            }).fail(function (err) {
                reject(err);
            }).done();
        });
        promises.push(tie_breakers);


        // when everything is done resolve our master defer
        Q.all(promises)
            .then(function () {
                exports.getByNameKey(replace_with)
                    .then(function (player) {
                        player.active = true; // ok to force since they would have to be active to replace
                        d.resolve(player);
                    })
                    .fail(function (err) {
                        err.msg = "<p>User was replaced, but we could not return the new player because:</p><p>" + err.msg + "</p>";
                        d.reject(err);
                    }).done();
            })
            .fail(function (err) {
                d.reject(err);
            }).done();

    }); // end db connection callback

    return d.promise;
}


exports.getSeasonsForNameKey = function (name_key) {
    var d = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var query = db.query("SELECT season_id FROM player_to_season WHERE name_key=?", [name_key], function (err, rows) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }
            var ids = [];
            for (i in rows) {
                ids.push(rows[i].season_id);
            }
            d.resolve(ids);
            db.release();
        });
    });

    return d.promise;
}


function getPool() {
    return module.parent.exports.pool;
}

/*
 *	Actual Object
 */
exports.Player = Player;
function Player(opts) {
    for (prop in opts) {
        if (prop in this) {
            this[prop] = opts[prop];
        }
    }

    this.full_name = this.first_name + ' ' + this.last_name;
    if (this.first_name && this.last_name) {
        this.initials = this.first_name[0] + this.last_name[0];
    } else {
        this.initials = '';
    }

    this.had_sub = !!this.had_sub;

    if (this.active != undefined)
        this.active = !!this.active;

    if (this.dnp != undefined)
        this.dnp = !!this.dnp;
}
Player.prototype.player_id = null;
Player.prototype.first_name = null;
Player.prototype.last_name = null;
Player.prototype.full_name = null;
Player.prototype.initials = null;
Player.prototype.email = null;
Player.prototype.facebook_id = null;
Player.prototype.name_key = null;
Player.prototype.score = null;
Player.prototype.night_score = null;
Player.prototype.machines = null;
Player.prototype.hash = null;
Player.prototype.role = null;
Player.prototype.scoring_string = null;
Player.prototype.rank = null;
Player.prototype.previous_rank = null;
Player.prototype.previous_dnp = null;
Player.prototype.start_order = null;
Player.prototype.grouping = null;
Player.prototype.dnp = null;
Player.prototype.had_sub = false;
Player.prototype.active = null;
Player.prototype.ifpa_id = null;

var db_fields = ['player_id', 'first_name', 'last_name', 'email', 'facebook_id', 'name_key', 'email', 'hash', 'role', 'ifpa_id'];

Player.prototype.getNightTotals = function (season_id) {
    var self = this,
        d    = Q.defer(),
        sql  = "SELECT " +
            "ln.title, DATE_FORMAT(ln.starts, '%Y-%m-%d') AS starts, ln.description AS description, pppn.points, lns.sub, lno.dnp " +
            "FROM " +
            "league_night ln " +
            "LEFT JOIN player_points_per_night pppn USING(starts) " +
            "LEFT JOIN league_night_sub lns ON(lns.night_id = ln.night_id AND lns.name_key = pppn.name_key) " +
            "LEFT JOIN league_night_order lno ON(lno.night_id = ln.night_id AND lno.name_key = pppn.name_key) " +
            "WHERE " +
            "ln.season_id=? " +
            "AND pppn.name_key=? " +
            "ORDER BY starts DESC";

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var query = db.query(sql, [season_id, self.name_key], function (err, rows) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            d.resolve(rows);
            db.release();
        });
    });

    return d.promise;
}

Player.prototype.getNightPlace = function (season_id) {
    var self     = this,
        all_done = Q.defer(),
        places   = {};

    // get the rank for the nights from the start order table
    var nights_d = Q.defer(),
        sql      = "SELECT " +
            "DATE_FORMAT(n.starts, '%Y-%m-%d') AS starts, lno.rank " +
            "FROM " +
            "league_night n " +
            "JOIN league_night_order lno USING(night_id) " +
            "WHERE " +
            "n.season_id = ? " +
            "AND lno.name_key = ? " +
            "ORDER BY " +
            "n.starts";

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var query = db.query(sql, [season_id, self.name_key], function (err, rows) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }

            rows.forEach(function (r) {
                places[r.starts] = r.rank;
            });

            // add in our totals, which is just the last night played
            places['totals'] = rows[rows.length - 1].rank;

            nights_d.resolve(places);
            db.release();
        });
    });

    // get the totals from the rankings
    var totals_d = module.parent.exports.playerlist.getRankings(season_id);
    totals_d.then(function (list) {
        places['totals'] = list.getPlaceForPlayer(self.name_key);
    });

    Q.all([nights_d.promise, totals_d])
        .then(function () {
            all_done.resolve(places);
        })
        .fail(function (err) {
            all_done.reject(err);
        }).done();


    return all_done.promise;


    module.parent.exports.leaguenight.getAllForSeason(season_id)
        .then(function (nights) {

            var places = {},
                defers = [];

            nights.forEach(function (night, index, arr) {
                var ranking_d = module.parent.exports.playerlist.getRankings(season_id, night.night_id);
                ranking_d.then(function (list) {
                    places[night.starts] = list.getPlaceForPlayer(self.name_key);
                });
                defers.push(ranking_d);
            });

            var totals_d = module.parent.exports.playerlist.getRankings(season_id);
            totals_d.then(function (list) {
                places['totals'] = list.getPlaceForPlayer(self.name_key);
            });
            defers.push(totals_d);

            Q.all(defers)
                .then(function () {
                    d.resolve(places);
                })
                .fail(function (err) {
                    d.reject(err);
                }).done();


        })
        .fail(function (err) {
            d.reject(err);
        }).done();

    return d.promise;
}

Player.prototype.getMachinePoints = function (season_id) {
    var d    = Q.defer(),
        self = this;

    var sql = "SELECT " +
        "m.*, lns.points, DATE_FORMAT(n.starts, '%Y-%m-%d') AS starts, lnsub.sub " +
        "FROM " +
        "league_night n " +
        "LEFT JOIN league_night_score lns USING(night_id) " +
        "LEFT JOIN machine m USING(abbv) " +
        "LEFT JOIN league_night_sub lnsub USING(night_id, name_key) " +
        "WHERE " +
        "n.season_id=? " +
        "AND lns.name_key=? " +
        "ORDER BY m.name";

    getPool().getConnection(function (err, db) {
        if (err) {
            db.release();
            d.reject(err);
            return false;
        }

        var query = db.query(sql, [season_id, self.name_key], function (err, rows) {
            if (err) {
                db.release();
                d.reject(err);
                db.release();
                return false;
            }

            d.resolve(rows);
            db.release();
        });
    });

    return d.promise;
}

Player.prototype.getMachinePicks = function (season_id) {
    var d    = Q.defer(),
        self = this;

    var sql = "SELECT " +
        "m.*, n.starts AS picked_on " +
        "FROM " +
        "league_night n " +
        "LEFT JOIN machine_to_league_night mtln USING(night_id) " +
        "LEFT JOIN machine m USING(abbv) " +
        "WHERE " +
        "n.season_id = ? " +
        "AND mtln.picked_by = ? " +
        "ORDER BY m.name";

    getPool().getConnection(function (err, db) {
        if (err) {
            db.release();
            d.reject(err);
            return false;
        }

        var query = db.query(sql, [season_id, self.name_key], function (err, rows) {
            if (err) {
                db.release();
                d.reject(err);
                db.release();
                return false;
            }

            d.resolve(rows);
            db.release();
        });
    });

    return d.promise;
}

Player.prototype.getHeadToHead = function (season_id) {
    var d    = Q.defer(),
        self = this;

    var sql = "SELECT " +
        "lns.name_key, " +
        "p.first_name, p.last_name, " +
        "DATE_FORMAT(ln.starts, '%Y-%m-%d') AS starts, " +
        "lns.abbv, " +
        "m.name AS machine_name, " +
        "lns.points " +
        "FROM " +
        "league_night ln " +
        "LEFT JOIN league_night_order lno_p USING(night_id) " +
        "LEFT JOIN league_night_order lno_opp USING(night_id, grouping) " +
        "JOIN league_night_score lns ON( " +
        "lno_opp.night_id = lns.night_id  " +
        "AND lno_opp.name_key = lns.name_key " +
        ") " +
        "LEFT JOIN player p ON( lno_opp.name_key = p.name_key ) " +
        "LEFT JOIN machine m USING(abbv) " +
        "LEFT JOIN league_night_sub AS player_sub ON( " +
        "player_sub.name_key = lno_p.name_key " +
        "AND player_sub.night_id = lns.night_id " +
        ") " +
        "LEFT JOIN league_night_sub AS opponent_sub ON( " +
        "opponent_sub.name_key = lno_opp.name_key " +
        "AND opponent_sub.night_id = lns.night_id " +
        ") " +
        "WHERE " +
        (season_id != undefined ? "ln.season_id = " + season_id + " AND " : '' ) +
        "lno_p.name_key = ? " +
        "AND lno_p.dnp = 0 " +
        "AND player_sub.sub_id IS NULL " +
        "AND opponent_sub.sub_id IS NULL " +
        "AND lns.points != 0 " +
        "ORDER BY " +
        "name_key, " +
        "lns.abbv, " +
        "ln.starts DESC";

    getPool().getConnection(function (err, db) {
        if (err) {
            db.release();
            d.reject(err);
            return false;
        }

        var query = db.query(sql, [self.name_key], function (err, results) {
            if (err) {
                db.release();
                d.reject(err);
                return false;
            }

            var data = {
                players: {},
                machines: {}
            };

            results.forEach(function (r) {
                if (data.players[r.name_key] == undefined) {
                    data.players[r.name_key] = {
                        first_name: r.first_name,
                        last_name: r.last_name,
                        machines: {}
                    };
                }

                if (data.players[r.name_key].machines[r.abbv] == undefined) {
                    data.players[r.name_key].machines[r.abbv] = {};
                }

                data.players[r.name_key].machines[r.abbv][r.starts] = r.points;
                data.machines[r.abbv] = r.machine_name;
            });

            d.resolve(data);
            db.release();
        });
    });

    return d.promise;
};


Player.prototype.save = function () {
    var self = this,
        d    = Q.defer();

    getPool().getConnection(function (err, db) {
        if (err) {
            d.reject(err);
            return false;
        }

        var data = {};
        db_fields.forEach(function (fld) {
            if (self[fld] != undefined) {
                data[fld] = self[fld];
            }
        });

        var query = db.query("INSERT INTO player SET ? ON DUPLICATE KEY UPDATE ?", [data, data], function (err, result) {
            if (err) {
                d.reject(err);
                db.release();
                return false;
            }
            d.resolve(self);
            db.release();
        });
    });

    return d.promise;
}