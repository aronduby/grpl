define(['js/app'], function(app){
	
	function NavApi(defaults){

		this.title = defaults.title;
		this.subtitle = defaults.subtitle;
		this.center_panel_key = false;

		this.setTitle = function(title, subtitle){
			this.title = title;
			this.subtitle = subtitle;
		};

		this.defaultTitle = function(){
			this.title = defaults.title;
			this.subtitle = defaults.subtitle;
		}

		this.setCenterPanelKey = function(key){
			this.center_panel_key = key;
		}
	};

	app.provider('navApi', function navApiProvider(){
		var defaults = {
			title: null,
			subtitle: null
		};

		this.setDefaults = function(title, subtitle){
			defaults.title = title;
			defaults.subtitle = subtitle;
		}

		this.$get = [function navApiFactory(){
			return new NavApi(defaults);
		}];
	});

	return app;

});