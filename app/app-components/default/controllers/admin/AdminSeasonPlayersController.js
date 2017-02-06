define(function (require) {
    'use strict';

    var app = require('js/app');
    var injectParams = ['$scope', '$q', 'Seasons', 'Players', 'api', 'loadingOverlayApi', 'navApi', 'dialog'];

    function AdminSeasonPlayersController($scope, $q, Season, Players, api, loadingOverlayApi, navApi, dialog) {
        loadingOverlayApi.show();
        navApi.defaultTitle();

        Players.getAllPlayers()
            .then(function () {
                $scope.players = Players.all;
            })
            .finally(function () {
                loadingOverlayApi.hide();
            });

        // Toggle the active state for a player
        $scope.setActive = function (player, active) {
            player.active = active;
        };

        // Quick Add
        $scope.quickAddPlayer = null;
        $scope.quickAdd = function (player) {
            loadingOverlayApi.show();
            $q.when(api.post('user.quickAdd', player))
                .then(function (player) {
                    // might not have to do anything here
                })
                .catch(function (err) {
                    dialog.open(err);
                })
                .finally(function () {
                    loadingOverlayApi.hide();
                });

            $scope.quickAddPlayer = null;
        };

        // Save
        $scope.save = function save() {
            loadingOverlayApi.show();

            var nameKeys = _.chain($scope.players)
                .filter({'active': true})
                .map('name_key')
                .value();

            $q.when(api.post('users.batchActivation', nameKeys))
                .catch(function(err) {
                    dialog(err);
                })
                .finally(function() {
                   loadingOverlayApi.hide();
                });
        };
    }

    AdminSeasonPlayersController.$inject = injectParams;
    app.register.controller('AdminSeasonPlayersController', AdminSeasonPlayersController);

    return app;

});