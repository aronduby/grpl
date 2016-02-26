define(function(require){
    'use strict';

    var app = require('js/app');

    var injectParams = ['$http', 'IFPA_API_KEY', IFPA];

    function IFPA($http, api_key){

        var self = this;
        this.url_base = 'https://api.ifpapinball.com/v1/';


        this.getPlayerByID = function getPlayerByID(id) {
            // return $http.get( self.url_base + 'player/' + id + '?api_key=' + api_key );
            return $http.get('/ifpa/player.json');
        };

        this.playerSearch = function playerSearch(q){
            return $http.get( self.url_base + 'player/search?q=' + q + '&api_key=' + api_key );
        };


    }

    app.service('IFPA', injectParams);

    return app;
});