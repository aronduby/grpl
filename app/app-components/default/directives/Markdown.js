// don't use showdowns compressed version since it loads its own angular module that we dont want
define(function(require){

	var
		app          = require('js/app'),
		Showdown     = require('showdown'),
		classedlinks = require('app-components/showdown-classedlinks');
	
	app.register.directive('markdown', function($compile){
	  
		var converter = new Showdown.converter();

		return {
			restrict: 'EA',
			require: '?ngModel',
			link:  function(scope, element, attrs, model) {

				// granted this should be setup in its own file and loaded as a showdown extension
				// BUT its included here since it needs scoped variables
				var include = function(converter) {
					return [
						{ type: 'lang', regex: '\\^(.+?)\\^', replace: function(match, val){
							val = val.trim();
							if(scope.tpls[val] !== undefined){
								return '<ng-include src="\''+scope.tpls[val]+'\'"></ng-include>';
							} else {
								return '<pre class="no-tpl">no tpl named '+val+'</pre>';
							}
						}}
					];
				};
				// Client-side export
				Showdown.extensions.include = include;


				// Check for extensions
				var extAttr = attrs['extensions'];
				
				if(extAttr) {
					var extensions = [];
					extAttr.split(',').forEach(function(val){
						extensions.push(val.trim());
					});
					converter = new Showdown.converter({extensions: extensions});
				}

				// Check for option to strip whitespace
				var stripWS = attrs['strip'];
				if(String(stripWS).toLowerCase() == 'true'){
					stripWS = true;
				} else {
					stripWS = false;
				}

				// Check for option to allow html
				var allowHtml = attrs['allowHtml'];
				if(String(allowHtml).toLowerCase() == 'true'){
					allowHtml = true;
				} else {
					allowHtml = false;
				}

				// Check for option to translate line breaks
				var lineBreaks = attrs['lineBreaks'];
				if(String(lineBreaks).toLowerCase() == 'true') {
				  lineBreaks = true;
				} else {
				  lineBreaks = false;
				}

				var render = function(){
					var htmlText = "";
					var val = "";

					if(attrs['ngModel']) {
						if(model.$modelValue) {
							val = model.$modelValue;
						}
					} else {
						// Export using text() by default...
						var exportFn = 'text';

						// But with html() if allowHtml is "true"
						if (allowHtml) {
							exportFn = 'html';
						}

						val = element[exportFn]();
					}

					if(stripWS) {
						val = val.replace(/^[ \t]+/g, '').replace(/\n[ \t]+/g, '\n');
					}

					if(lineBreaks) {
						val = val.replace(/&#10;/g, '\n');
					}

					// Compile the markdown, and set it.
					htmlText = converter.makeHtml(val);
					element.html(htmlText);
					$compile(element.contents())(scope); // <- the new magic which auto brings in the parent scope
					
				};

				if(attrs['ngModel']) {
					scope.$watch(attrs['ngModel'], render);
				}

				render();
			}
		}
	});

	return app;
});