(function () {
    'use strict';

    var title = "Group Tiered Swiss Pairings";
    var description = "The same thing used for Pinburgh.";

    function sort(players, options) {

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
            window.GroupTieredSwissPairing = sort;
        }
    }

})();