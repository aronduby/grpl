define(function(require){

    var app = require('js/app');

    app.register.directive('grplIfpaStanding', ifpaStanding);
    ifpaStanding.$inject = ['PlayerData', 'IFPA', 'Players', 'promiseTracker'];
    function ifpaStanding(PlayerData, IFPA, Players, promiseTracker){
        return {
            restrict: 'EA',
            scope: {},
            templateUrl: 'app-components/partials/players/ifpa-standing.html',
            link: link
        };

        function link($scope, $el, $attr) {

            $scope.player = null;
            $scope.ifpa = {id: null};
            $scope.ifpa_tracker = promiseTracker();
            $scope.ifpa_tracker.addPromise(PlayerData.promise);
            $scope.saveIFPA = saveIFPA;

            PlayerData.promise.then(function () {
                $scope.player = PlayerData.player;
                if (PlayerData.player.ifpa_id) {
                    $scope.ifpa.id = PlayerData.player.ifpa_id;
                    loadIFPA();
                }
            });

            function loadIFPA() {
                var loading = IFPA.getPlayerByID(PlayerData.player.ifpa_id);
                $scope.ifpa_tracker.addPromise(loading);
                loading.then(function (rsp) {
                    var data = rsp.data;
                    $scope.ifpa.world = data.player_stats.current_wppr_rank;
                    $scope.ifpa.state = _.find(data.championshipSeries, {'group_code': 'MI'}).rank;
                });
            }

            function saveIFPA() {
                var saving = Players.saveIFPAID(PlayerData.player.name_key, $scope.ifpa.id);
                $scope.ifpa_tracker.addPromise(saving);
                saving.then(function () {
                    PlayerData.player.ifpa_id = $scope.ifpa.id;
                    loadIFPA();
                });
            }

        };
    }

    return app;
});