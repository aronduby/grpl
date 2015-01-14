define(['js/app'], function(app){
	
	app.factory('inlineModalApi', ['$modal', function($modal){
		var tpls = {};
		
		var default_controller = function($scope, $modalInstance){
			$scope.close = function(){
				$modalInstance.close();
			};
		};

		return{
			add: function(id, tpl){
				tpls[id] = tpl;
			},
			remove: function(id){
				delete tpls[id];
			},
			open: function(id, opts){
				var modal_opts = angular.extend({}, opts, {template: tpls[id]});
				if(!modal_opts.controller){
					modal_opts.controller = default_controller;
				}
				return $modal.open(modal_opts);
			}
		}
	}])

	app.directive('inlineModal', ['inlineModalApi', function(inlineModalApi) {
		return {
			restrict: 'A',
			link: function($scope, element, attrs) {

				var updater = _.debounce(function(newVal, oldVal){
					$scope.$apply(function(){
						var tpl = element[0].outerHTML,
							comment_re = /<!--.*?-->/g,
							ng_re = /ng-.*=".*" /g;

						tpl = tpl.replace('inline-modal=""', '');
						tpl = tpl.replace(comment_re, '');
						tpl = tpl.replace(ng_re, '');

						console.log(tpl);

						inlineModalApi.add(attrs.id, tpl);	
					});					
				}, 500);

				$scope.$watch(function(){ return element.html(); },  updater);

				$scope.$on('$destroy', function() {
					inlineModalApi.remove(attrs.id);
				});
			}
		};
	}]);

	return app;
});