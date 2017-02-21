define(function(require){

    var app = require('js/app');

    app.register.directive('grplLeagueStanding', leagueStanding);
    leagueStanding.$inject = ['$q', 'PlayerData', 'googleChartApiPromise'];
    function leagueStanding($q, PlayerData, googleChartApiPromise){
        return {
            restrict: 'EA',
            scope: {},
            templateUrl: 'app-components/partials/players/league-standing.html',
            link: link
        };

        function link($scope, $el, $attr) {

            $scope.total_points = null;
            $scope.player = null;
            $scope.nights = null;
            $scope.places = null;

            PlayerData.promise.then(function(){
                $scope.total_points = PlayerData.total_points;
                $scope.player = PlayerData.player;
                $scope.nights = PlayerData.nights.reverse();
                $scope.places = PlayerData.places;
            });

            $q.all([googleChartApiPromise, PlayerData.promise]).then(drawChart);

            $scope.chart = {
                type: 'LineChart',
                options: {
                    title: 'Points/Place per League Night',
                    titleTextStyle: {
                        fontName: 'Roboto Condensed',
                        fontSize: 16,
                        color: '#8b8b8b',
                        bold: true
                    },
                    height: 300,
                    titlePosition: 'none',
                    fontName: 'Roboto Condensed',
                    chartArea: {
                        top: '5%',
                        left: '5%',
                        width: '90%',
                        height: '90%'
                    },
                    axisTitlesPosition: 'none',
                    annotations: {
                        textStyle: {
                            color: '#8b8b8b'
                        }
                    },
                    backgroundColor: 'transparent',
                    lineWidth: 4,
                    pointSize: 8,
                    legend: {
                        position: 'none'
                    },
                    // Gives each series an axis that matches the vAxes number below.
                    series: {
                        0: {
                            targetAxisIndex: 0,
                            color: '#699db1'
                        },
                        1: {
                            targetAxisIndex: 1,
                            color: '#d3c9a9'
                        },
                        2: {
                            targetAxisIndex: 0,
                            color: '#8db27b'
                        }
                    },
                    vAxes: {
                        // Adds titles to each axis
                        0: {
                            title: 'Points',
                            viewWindow: {
                                min: -1,
                                max: 36
                            },
                            ticks: [5, 15, 25, 35]
                        },
                        1: {
                            title: 'Place',
                            direction: -1,
                            viewWindow: {
                                min: 0,
                                max: 53
                            },
                            gridlines: {
                                color: 'transparent'
                            },
                            ticks: [1, 15, 30, 45]
                        }
                    },
                    hAxis: {
                        gridlines: {
                            color: 'transparent'
                        },
                        viewWindowMode: 'pretty',
                        baselineColor: 'transparent',
                        textPosition: 'none'
                    },
                    vAxis: {
                        baselineColor: 'transparent'
                    }
                }
            };
            function drawChart() {
                $scope.chart.data = new google.visualization.DataTable();
                $scope.chart.data.addColumn('date', 'Night');
                $scope.chart.data.addColumn('number', "Points");
                $scope.chart.data.addColumn({type: 'string', role: 'annotation'});
                $scope.chart.data.addColumn('number', "Place");
                $scope.chart.data.addColumn({type: 'string', role: 'annotation'});
                $scope.chart.data.addColumn('number', 'Sub Points');

                _.each(PlayerData.nights, function (night, i) {
                    // figure out the place we ended up in at the end of the night
                    var end_place = 0;
                    if (PlayerData.nights[i + 1] === undefined) {
                        end_place = PlayerData.places.totals;
                    } else {
                        end_place = PlayerData.places[PlayerData.nights[i + 1].starts];
                    }

                    if (night.dnp) {
                        end_place = null;
                    }

                    var sub = null;
                    if (night.sub != null) {
                        sub = night.points;
                    }

                    $scope.chart.data.addRow([new Date(night.starts), night.points, '' + night.points, end_place, '' + end_place, sub]);
                });
            }

        };
    }

    return app;
});