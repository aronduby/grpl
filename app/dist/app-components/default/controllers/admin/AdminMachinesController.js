define(['js/app'], function(app){

	var injectParams = ['$scope', '$q', '$stateParams', '$state', 'api', 'navApi', 'loadingOverlayApi', 'Machines', 'dialog'];

	var AdminMachinesController = function($scope, $q, $stateParams, $state, api, navApi, loadingOverlayApi, Machines, dialog){
		loadingOverlayApi.show();
		navApi.defaultTitle();
		navApi.setCenterPanelKey('admin-machines-panel');

		$scope.machines = Machines.all;
		$scope.machine = null;
		$scope.new_image = {
			url: ''
		};

		if($stateParams.abbv === 'new'){
			// setup a new machine
			$scope.machine = {
				name: null,
				abbv: null,
				image: 'layout_imgs/machines/PH.png',
				note: null,
				active: false
			};

			navApi.setTitle('New Machine', 'Choose a Different Machine');
			loadingOverlayApi.hide();

		} else if($stateParams.abbv.trim() == ''){
			$scope.machine = null;
			loadingOverlayApi.hide();

		} else {
			$scope.machine = Machines.getMachine($stateParams.abbv);
			if($scope.machine == undefined){
				var inst = dialog({
					title: 'Machine Not Found',
					headline: 'Couldn\'t find that machine',
					msg: 'A machine could not be found for the passed in hash.',
				});
				inst.result.finally(function(){
					$state.go('admin.machines', {abbv: ''});
				});

			} else {
				if($scope.machine.image == undefined)
					$scope.machine.image = 'layout_imgs/machines/PH.png';

				navApi.setTitle($scope.machine.name, 'Choose Another Machine');
			}

			loadingOverlayApi.hide();
		}


		$scope.save = function(){
			loadingOverlayApi.show();

			var data = angular.copy($scope.machine);
			data.new_image = $scope.new_image.url;

			api.post('machine.update', data)
			.then(function(data){
				$state.go('admin.machines', {'abbv': ''});
				dialog({
					title: 'Machine updated',
					headline: 'Machine data has been saved',
					msg: '<p>The machines\'s data has been successfully saved.</p>'
				});
			})
			.catch(function(err){
				dialog(err);
			})
			.finally(function(){
				loadingOverlayApi.hide();
			});
		}
		
	};

	AdminMachinesController.$inject = injectParams;
	app.register.controller('AdminMachinesController', AdminMachinesController);
});