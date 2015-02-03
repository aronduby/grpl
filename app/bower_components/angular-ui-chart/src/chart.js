angular.module('ui.chart', [])
	.directive('uiChart', function ($window) {
		return {
			restrict: 'EACM',
			template: '<div></div>',
			replace: true,
			scope: {
				control: '=',
				uiChart: '=',
				chartOptions: '='
			},
			link: function (scope, elem, attrs) {
				scope.internalControl = scope.control || {};

				var plot, drawn = false;

				var renderChart = function () {
					var data = scope.uiChart;
					elem.html('');
					if (!angular.isArray(data)) {
						return;
					}

					var opts = {};
					if (!angular.isUndefined(scope.chartOptions)) {
						opts = scope.chartOptions;
						if (!angular.isObject(opts)) {
							throw 'Invalid ui.chart options attribute';
						}
					}

					// elem.empty().jqplot(data, opts);
					plot = $.jqplot(elem[0].id, data, opts);
					drawn = true;
				};

				scope.$watch('uiChart', function () {
					renderChart();
				}, true);

				scope.$watch('chartOptions', function () {
					renderChart();

				}, true);

				angular.element($window).on('resize', _.debounce(function(){
					renderChart();
				}, 300));

				scope.internalControl.redraw = function(){
					plot.replot(false);
				}
			}
		};
	});