define(function (require) {

    var app = require('js/app');
    var leagueStandings = require('app-components/directives/players/LeagueStanding');
    var ifpaStandings = require('app-components/directives/players/IFPAStanding');
    var machinePicks = require('app-components/directives/players/MachinePicks');
    var pointsPerMachine = require('app-components/directives/players/PointsPerMachine');
    var headToHead = require('app-components/directives/players/HeadToHead');

    // main controller in charge of loading the data
    // and the nav/panels
    // service/value for the player data so everything can share
    // everything else make it's own controller and include as need
    app.register.service('PlayerData', function () {
        return {
            machine_picks: null,
            machines: null,
            nights: null,
            places: null,
            player: null,
            total_points: null,
            promise: null
        };
    });

    var injectParams = ['$stateParams', '$scope', '$q', 'PlayerData', 'Players', 'Auth', 'navApi', 'api', 'promiseTracker', 'loadingOverlayApi', 'flare', 'socket'];
    var PlayersController = function ($stateParams, $scope, $q, PlayerData, Players, Auth, navApi, api, promiseTracker, loadingOverlayApi, flare, socket) {
        loadingOverlayApi.show();
        navApi.defaultTitle();
        navApi.setCenterPanelKey('players-panel');

        $scope.user = Auth.user;
        $scope.name_key = $stateParams.name_key;
        $scope.player = {};
        $scope.players = [];
        Players.loading.then(function () {
            $scope.players = Players.players;
        });

        loadPlayerSeason();

        function loadPlayerSeason() {
            loadingOverlayApi.show();
            PlayerData.promise = Players.getFullForSeason($scope.name_key);
            PlayerData.promise.then(function (data) {
                _.assign(PlayerData, data);
                $scope.player = PlayerData.player;
                loadingOverlayApi.hide();
                navApi.setTitle(PlayerData.player.first_name + ' ' + PlayerData.player.last_name, 'View a Different Player');
            });
        }

        function scoresEdited(data) {
            var edited_players = _.chain(data.scores).map(function(s){ return s.name_key; }).uniq().value();
            if (_.indexOf(edited_players, $scope.player.name_key) >= 0) {
                flare.warn('<h1>Scores Edited</h1><p>' + $scope.player.first_name + '\'s scores have been edited, we\'re updating everything for you.</p>', 5000);
                loadPlayerSeason();
            }
        }

        socket.addSelfDestroyingScope($scope)
            .on('scores_edited', scoresEdited);
    };

    PlayersController.$inject = injectParams;
    app.register.controller('PlayersController', PlayersController);

});