define(function (require) {

    var app = require('js/app');

    app.register.directive('grplHeadToHead', headToHead);
    headToHead.$inject = ['PlayerData', 'Players', 'promiseTracker', 'socket', 'flare'];
    function headToHead(PlayerData, Players, promiseTracker, socket, flare) {
        return {
            restrict: 'EA',
            scope: {
                type: '=',
                link: '='
            },
            templateUrl: 'app-components/partials/players/head-to-head.html',
            link: link
        };

        function link($scope, $el, $attr) {

            $scope.head_to_head = [];
            $scope.title = '';
            $scope.tracker = promiseTracker();

            var func = false;
            switch ($scope.type) {
                case 'season':
                    $scope.title = 'This Season';
                    func = 'getHeadToHead';
                    break;

                case 'allTime':
                    $scope.title = 'All Time';
                    func = 'getHeadToHeadAllTime';
                    break;
            }
            if (!func) {
                console.error('unknown type passed to head to head, must be season or allTime');
                return false;
            }

            PlayerData.promise.then(function(data){
                loadHeadToHead(func, PlayerData.player.name_key, $scope.tracker);
                var reload = _.partial(loadHeadToHead, func, PlayerData.player.name_key, $scope.tracker);
                _.set($scope.link, 'reload', reload);
            });

            function loadHeadToHead(func, name_key, tracker) {
                var loading = Players[func](name_key);
                tracker.addPromise(loading);
                loading.then(function(data){
                    $scope.head_to_head = reformatHeadToHead(data);
                });
            }

            function reformatHeadToHead(data) {
                var new_data = [],
                    player   = data.players[PlayerData.player.name_key];

                delete data.players[PlayerData.player.name_key];

                _.each(data.players, function (opponent) {
                    var o = {
                        first_name: opponent.first_name,
                        last_name: opponent.last_name,
                        games: [],
                        wins: 0,
                        losses: 0
                    };

                    _.each(opponent.machines, function (nights, abbv) {
                        _.each(nights, function (score, starts) {
                            var starts_str = starts.match(/(\d{4})-0?(\d{1,2})-0?(\d{1,2})/);
                            starts_str = starts_str[2] + '/' + starts_str[3] + '/' + starts_str[1];

                            var game = {
                                'abbv': abbv,
                                'title': data.machines[abbv],
                                'starts': starts_str,
                                'player': player.machines[abbv][starts],
                                'opponent': score,
                                'won': player.machines[abbv][starts] > score,
                                'starts_ts': new Date(starts).getTime()
                            };
                            o.games.push(game);
                        });
                    });

                    o.wins = _.reduce(o.games, function (memo, game) {
                        return memo + (game.won ? 1 : 0);
                    }, 0);
                    o.losses = o.games.length - o.wins;

                    new_data.push(o);
                });

                return new_data;
            }

            function scoresEdited(data) {
                loadHeadToHead(func, PlayerData.player.name_key, $scope.tracker);
                flare.warn('<h1>Scores Edited</h1><p>Scores have been edited, we\'re updating the head to head for you.</p>', 5000);
            }

            socket.addSelfDestroyingScope($scope)
                .on('scores_edited', scoresEdited);

        }
    }

    return app;

});