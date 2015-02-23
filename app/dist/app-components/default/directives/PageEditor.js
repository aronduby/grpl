define(function(require){
	
	var app = require('js/app');


	app.register.directive('pageEditor', ['api', 'loadingOverlayApi', '$modal', function(api, loadingOverlayApi, $modal){
		return {
			restrict: 'EA',
			scope: {
				page: '=',
				help: '=?'
			},
			templateUrl: 'app-components/partials/page-editor.html',
			link:  function(scope, element, attrs) {
				scope.show = false;

				var original_page;

				var unwatchPage = scope.$watchCollection('page', function(newPage, oldPage){
					if(newPage.ignore === undefined){
						original_page = angular.copy(newPage);
						unwatchPage();
					}
				});

				scope.showHelp = function(){
					var modalInstance = $modal.open({
						templateUrl: 'app-components/partials/markdown-help.html',
						size: 'lg',
						resolve: {
							variables: function(){ return scope.help.variables; },
							templates: function(){ return scope.help.templates; }
						},
						controller: function($scope, $modalInstance, variables, templates){
							$scope.variables = variables;
							$scope.templates = templates;

							$scope.close = function(){
								$modalInstance.close();
							}
						}
					});
				};

				scope.cancel = function(){
					angular.copy(original_page, scope.page);
					scope.show = false;
				};

				scope.save = function(){
					loadingOverlayApi.show();
					api.post('page.update', scope.page)
					.then(function(){
						loadingOverlayApi.hide();
						scope.show = false;
					});
				};

			}
		}
	}]);

});