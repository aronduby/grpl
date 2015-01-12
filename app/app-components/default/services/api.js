define(['app-components/services/socket'], function(servicesApp){

	function Api($q){
		var Socket;

		this.default_opts = {
			success: function(){  },
			error: function(){  },
			complete: function(){ return true; }
		};

		this.setSocket = function(sock){
			Socket = sock;
		};

		this.get = function(method, argument, opts){
			var d = $q.defer();

			/*
			if(argument !== undefined && opts === undefined){
				opts = argument;
				argument = undefined;
			}
			*/
			
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
	}

	servicesApp.service('api', ['$q', Api]);

	return servicesApp;

});