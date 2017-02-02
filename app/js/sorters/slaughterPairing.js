(function () {
    'use strict';

    var title = "Slaughter Pairings";
    var description = "First player plays bottom player.";

    function sort(players, options) {
        var groups = [];

        players = players.slice(0);

        while (players.length) {
            var count = players.length;
            var middleOffset = Math.ceil(count/2) - 2;
            var threePlayerGroup = (count == 3 || count == 6 || count === 9);
            var group = [];

            var first = players.splice(0,1);
            var middle = players.splice(middleOffset, threePlayerGroup ? 1 : 2);
            var last = players.splice(-1, 1);

            group = first.concat(middle, last);

            groups.push(group);
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
            window.SlaughterPairing = sort;
        }
    }

})();