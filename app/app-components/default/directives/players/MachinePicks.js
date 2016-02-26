define(function(require){

    var app = require('js/app');

    app.register.directive('grplMachinePicks', machinePicks);
    machinePicks.$inject = ['PlayerData'];
    function machinePicks(PlayerData){
        return {
            restrict: 'EA',
            scope: {},
            templateUrl: 'app-components/partials/players/machine-picks.html',
            link: link
        };

        function link($scope, $el, $attr) {

            $scope.machine_picks = [];

            PlayerData.promise.then(function(){
                $scope.machine_picks = _.chain(PlayerData.machine_picks)
                    .each(function (obj) {
                        obj.picked_on = moment(obj.picked_on)
                    })
                    .groupBy('abbv')
                    .value();
            });

        }
    }

    return app;
});