define(['js/app'], function(app){

	var injectParams = ['$scope', 'loadingOverlayApi', 'navApi'];

	var TiesController = function($scope, loadingOverlayApi, navApi){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('nights-panel');
		
	};

	TiesController.$inject = injectParams;
	app.register.controller('TiesController', TiesController);
});