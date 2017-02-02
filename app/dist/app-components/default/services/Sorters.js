define(function (require) {
    'use strict';

    var app = require('js/app');

    var sorters = {
        adjacent: require('js/sorters/adjacentPairing'),
        groupTieredSwiss: require('js/sorters/groupTieredSwissPairing'),
        slaughter: require('js/sorters/slaughterPairing')
    };

    SorterService.$inject = ['$q', '$modal'];
    function SorterService($q, $modal) {

        // sorters return groups of player objects
        // this applies the proper values to the player objects themselves
        function applyGrouping(groups) {
            var order = 0;
            groups.forEach(function (group, groupNumber) {
                group.forEach(function (player) {
                    player.grouping = groupNumber;
                    player.start_order = order;

                    order++;
                });
            });
        }

        // nothing fancy, just wraps the sorter to call applyGrouping
        function defaultWrapper(sortFn) {
            var fn = function (players, options) {
                return $q.when(sortFn(players, options))
                    .then(applyGrouping)
                    .catch(function (err) {
                        console.error(err);
                    });
            };

            fn.title = sortFn.title;
            fn.description = sortFn.description;

            return fn;
        }

        // Uses $modal service to open the specified template to gather options
        // then passes those options along to the sorter with the players
        // template should expose a $scope.options model with the expected values
        function dialogWrapper(sortFn, templateUrl) {
            var fn = function (players) {
                return $q(function(resolve, reject) {
                    var modalInstance = $modal.open({
                        templateUrl: templateUrl,
                        controller: function($scope, $modalInstance) {
                            $scope.cancel = function() {
                                $modalInstance.dismiss('cancel');
                            };
                            $scope.sort = function() {
                                $modalInstance.close($scope.options);
                            };
                        }
                    });

                    modalInstance.result
                        .then(function(options) {
                            $q.when(sortFn(players, options))
                                .then(applyGrouping)
                                .then(resolve)
                                .catch(reject);
                        });
                });
            };

            fn.title = sortFn.title;
            fn.description = sortFn.description;

            return fn;
        }

        sorters.adjacent = defaultWrapper(sorters.adjacent);
        sorters.slaughter = defaultWrapper(sorters.slaughter);
        sorters.groupTieredSwiss = dialogWrapper(sorters.groupTieredSwiss, 'app-components/partials/modals/group-tiered-swiss-options.html');

        return sorters;
    }

    app.register.service('Sorters', SorterService);

    return sorters;
});