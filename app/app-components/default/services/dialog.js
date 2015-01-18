define(['js/app'], function(app){

	var DialogController = function($scope, $modalInstance, title, headline, msg, additional_classes, btn_text){	

		$scope.title = title;
		$scope.headline = headline;
		$scope.msg = msg;
		$scope.additional_classes = additional_classes;
		$scope.btn_text = btn_text;

		$scope.confirm = function(){
			$modalInstance.close(true);
		};

		$scope.cancel = function(){
			$modalInstance.dismiss(false);
		};
	};


	app.register.service('dialog', ['$modal', function($modal){
		var defaults = {
			title: '',
			headline: '',
			msg: '',
			additional_classes: '',
			btn_text: 'ok'
		};

		return function Dialog(options){
			//do new if user doesn't
			if (!(this instanceof Dialog)) {
			  return new Dialog(options);
			}

			options = options || {};
			options = angular.extend({}, defaults, options);

			return $modal.open({
				templateUrl: 'app-components/partials/dialog.html',
				controller: DialogController,
				resolve:{
					title: function(){ return options.title; },
					headline: function(){ return options.headline; },
					msg: function(){ return options.msg; },
					additional_classes: function(){ return options.additional_classes; },
					btn_text: function(){ return options.btn_text; }
				}
			});			
		}
	}]);

	return app;
})