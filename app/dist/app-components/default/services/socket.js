define([], function(){

	/*
	 *	The actual connection to the socket server
	 *	Using a defered style here to be able to trigger the angular bootstrap
	*/
	var address = 'http://'+window.location.host+':834',
		options = {
			'sync disconnect on unload': true,
			'max reconnection attempts': 5
		}

	var socket = io.connect(address, options);

	// quick slap together a defer
	var promise = {
		okCallbacks: [],
		koCallbacks: [],
		status: null,
		data: null,
		then: function(okCallback){
			if(this.status == 'resolved'){
				okCallback(this.data);
			} else {
				this.okCallbacks.push(okCallback);
			}
		},
		fail: function(koCallback){
			if(this.status == 'rejected'){
				koCallback(this.data);
			} else {
				this.koCallbacks.push(koCallback);
			}
		}
	};

	var defer = {
		promise: promise,
		resolve: function(data){
			this.promise.status = 'resolved';
			this.promise.data = data;
			this.promise.okCallbacks.forEach(function(callback){
				window.setTimeout(function(){
					callback(data);
				}, 0)
			});
		},
		reject: function(err){
			this.promise.status = 'rejected';
			this.promise.data = data;
			this.promise.koCallbacks.forEach(function(callback){
				window.setTimeout(function(){
					callback(err);
				}, 0);
			});
		}
	};

	socket.on('connect', function(){
		defer.resolve(socket);
	});


	/*
	 *	Used to house our services/providers defined below
	*/
	var servicesApp = angular.module('socketServices', []);


	/*
	 *	Socket Provider
	 * 	Direct-ish access to our socket above
	 *
	 *	Usage example, from within controller

		socket.addScope($scope.$id)
			.on('score.new', updateScore)
			.on('score.update', updateScore)
			.on('score.delete', deleteScore)
			.on('reconnect', function(){
				loadTournament($scope.current_tournament.id);
			});


		$scope.$on("$destroy", function() {
			socket.getScope($scope.$id).clear();
		});	
	*/
	function Socket($rootScope){
		var scopes = {};

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
			var scope  = this.getScope(id);
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

	servicesApp.service('socket', ['$rootScope', Socket]);


	/*
	 *	The socket backed Api
	*/
	function Api($q, Socket){

		this.default_opts = {
			success: function(){  },
			error: function(){  },
			complete: function(){ return true; }
		};

		this.get = function(method, argument, opts){
			var d = $q.defer();
			
			opts = angular.extend({}, this.default_opts, opts);
			opts.method = method;

			var cb = function(err, data){
				console.groupCollapsed('Api.get', method, argument);
				console.log(err, data);
				console.groupEnd();
				
				if(err){
					opts.error(err);
					d.reject(err);
				} else {
					opts.success(data);
					d.resolve(data);
				}
				opts.complete();
			}

			if(argument != null){
				Socket.emit(method, argument, cb);
			} else {
				Socket.emit(method, cb);
			}

			return d.promise;
		};

		this.post = function(method, argument, opts){
			return this.get(method, argument, opts);
		};
	};

	servicesApp.service('api', ['$q', 'socket', Api]);


	
	// finally return our promise from above so we can trigger things to happen once we are connected
	return defer.promise;

});
