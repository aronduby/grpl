// based on https://github.com/haugstrup/TournamentUtils/blob/master/src/AdjacentPairing.php

(function () {
    'use strict';

    var title = "Adjacent Pairing";
    var description = "Groups of 4 (3 when necessary) in order of ranking";

    var defaults = {
        sortField: "rank"
    };

    function sort(players, options) {
        if (options == undefined){
            options = {};
        }
        var opts = Object.assign({}, defaults, options);
        var groups = [];

        if (players.length <= 5) {
            throw new Error('You must have more than 5 players');
        }

        players = players.slice(0);

        // assumes sortField is numeric
        players.sort(function(a, b) {
            return a[opts.sortField] - b[opts.sortField];
        });

        while (players.length) {
            var size = (players.length == 3 || players.length == 6 || players.length === 9) ? 3 : 4;

            groups.push( players.splice(0, size));
        }

        return groups;
    }

    sort.title = title;
    sort.description = description;

    // export for node, amd, or window
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = sort;
    } else {
        if (typeof define === 'function' && define.amd) {
            define([], function () {
                return sort;
            });
        } else {
            window.AdjacentPairing = sort;
        }
    }

})();