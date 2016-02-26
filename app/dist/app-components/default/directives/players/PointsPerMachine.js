define(function(require){

    var app = require('js/app');

    app.register.directive('grplPointsPerMachine', pointsPerMachine);
    pointsPerMachine.$inject = ['PlayerData', 'Players', 'loadingOverlayApi', 'socket', 'flare'];
    function pointsPerMachine(PlayerData, Players, loadingOverlayApi, socket, flare){
        return {
            restrict: 'EA',
            scope: {
                link: '='
            },
            templateUrl: 'app-components/partials/players/points-per-machine.html',
            link: link
        };

        function link($scope, $el, $attr) {

            $scope.player = null;
            $scope.machines = [];
            $scope.players = [];
            $scope.compare_to = null;
            $scope.compare_machines = null;
            $scope.machine_bar_multiplier = 1;

            PlayerData.promise.then(function () {
                $scope.player = PlayerData.player;
                $scope.machines = PlayerData.machines;
                $scope.machine_bar_multiplier = calcMachineBarMultiplier(PlayerData.machines);
            });

            Players.loading.then(function () {
                $scope.players = Players.players;
            });

            $scope.$watch('compare_to', function (newVal, oldVal) {
                if(newVal !== null && newVal != oldVal){
                    compareTo(newVal, false);
                }
            });

            _.set($scope.link, 'reload', _.partial(compareTo, $scope.compare_to));

            function compareTo(player, suppress_loading) {
                if (player !== null) {
                    if (!suppress_loading)
                        loadingOverlayApi.show();

                    Players.getFullForSeason(player.name_key)
                        .then(function (data) {
                            // filter out machines which the scoped player hasn't played
                            var compare_abbvs = _.map(PlayerData.machines, function(machine){
                                return machine.abbv;
                            });
                            $scope.compare_machines = _.chain(data.machines)
                                .filter(function (machine) {
                                    return _.indexOf(compare_abbvs, machine.abbv) >= 0;
                                })
                                .tap(function (macs) {
                                    $scope.machine_bar_multiplier = Math.max(calcMachineBarMultiplier(macs), calcMachineBarMultiplier(PlayerData.machines));
                                })
                                .groupBy('abbv')
                                .value();

                        })
                        .finally(function () {
                            if (!suppress_loading)
                                loadingOverlayApi.hide();
                        })
                } else {
                    $scope.compare_machines = null;
                    $scope.machine_bar_multiplier = calcMachineBarMultiplier(PlayerData.machines);
                }
            }

            function calcMachineBarMultiplier(machines) {
                return _.chain(machines)
                    .groupBy('abbv')
                    .values()
                    .maxBy(function (m) {
                        return m.length;
                    })
                    .value()
                    .length;
            }

            function scoresEdited(data){
                var edited_players = _.chain(data.scores).map(function(s){ return s.name_key; }).uniq().value();
                if ($scope.compare_to != null && _.indexOf(edited_players, $scope.compare_to.name_key) >= 0) {
                    compareTo($scope.compare_to, true);
                    flare.warn('<h1>Scores Edited</h1><p>' + $scope.compare_to.first_name + '\'s scores have been edited, we\'re updating the points per machine comparison for you.</p>', 5000);
                }
            }

            socket.addSelfDestroyingScope($scope)
                .on('scores_edited', scoresEdited);
        }
    }

    return app;
});