define(['js/socketConnector'], function(socket){

	function Socket($rootScope, address, options){
		var scopes = {};

		socket.on('connect', function(){
			console.log('connected');
		})

		this.emit = function() {
			var args = Array.prototype.slice.call(arguments);
			if(args.length<=0)
				return;
			var responseHandler = args[args.length-1];
			if(angular.isFunction(responseHandler)) {
				args[args.length-1] = function() {
					var args = arguments;
					$rootScope.$apply(function() {
						responseHandler.apply(null, args);
					});
				}
			}
			socket.emit.apply(socket, args);
			return this;
		};

		this.on = function(e, handler) {
			addListener(e, wrapHandler(handler));
			return this;
		};

		this.addScope = function(id){
			var scope  = glue.getScope(id);
			if(scope == false){
				scope = new Scope(id);
			}
			return scope;
		};

		this.getScope = function(id){
			if(scopes[id]){
				return scopes[id];
			} else {
				return false;
			}
		};

		this.getSocket = function(){
			return socket;
		}


		/*
		 *	Create scoped objects which correspond to controllers scopes
		 *	this allows us to easily remove events for a controllers scope when it gets destroyed
		*/
		function Scope(id){
			this.id = id;
			this.events = {};
			scopes[id] = this;
		}
		Scope.prototype.on = function(e, handler){
			if(this.events[e] == undefined){
				this.events[e] = [];
			}
			var wrapped_handler = wrapHandler(handler); 
			this.events[e].push(wrapped_handler);
			addListener(e, wrapped_handler);
			return this;
		}
		Scope.prototype.clear = function(){
			// loop through all of our events and removeListener
			var keys = Object.keys(this.events);
			for(var i=0; i<keys.length; ++i){
				var e = keys[i],
					handlers = this.events[e];
			    
			    for(var j=0; j<handlers.length; ++j){
			    	socket.removeListener(e, handlers[j]);
			    }
			}
		}

		/*
		 *	Since we can remove things now we have to be able to have a reference to the actual function
		 *	since we have to use $rootScope.apply to bring the functions into "Angular Land" we can't just
		 *	use the bare handler, so this function will wrap the supplied handler with the proper Angular
		 *	code and return that function, which can be stored and used with removeListener
		*/
		function wrapHandler(handler){
			return function() {
				var args = arguments;
				$rootScope.$apply(function() {
					handler.apply(null, args);
				});
			}
		}

		/*
		 *	This actually adds the event listener to the socket. Make sure the handler has already been
		 *	wraped using the wrapHandler() function above
		*/
		function addListener(e, wrapped_handler){
			socket.on(e, wrapped_handler);
		}
	}


	var servicesApp = angular.module('socketServices', []);

	//Must be a provider since it will be injected into module.config()    
	servicesApp.provider('socket', function socketProvider(){
		var address = '',
			options = {};

		this.setAddress = function(addr){
			address = addr;
		};

		this.setOptions = function(opts){
			options = opts;
		}

		this.$get = ['$rootScope', function socketFactory($rootScope){
			return new Socket($rootScope, address, options);
		}];
	});

	return servicesApp;

});
