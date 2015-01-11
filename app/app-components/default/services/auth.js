define(['app-components/services/api', 'js/routingConfig'], function(servicesApp, routingConfig){

	// Load the SDK Asynchronously
	(function(d){
		var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
		if (d.getElementById(id)) {return;}
		js = d.createElement('script'); js.id = id; js.async = true;
		js.src = "//connect.facebook.net/en_US/all.js";
		ref.parentNode.insertBefore(js, ref);
	}(document));
	window.fbAsyncInit = function() {
		FB.init({
			appId: '554891544539566', // App ID
			channelUrl : 'http://www.grpl.info/channel.html', // Channel File
			status: true, // check login status
			cookie: true, // enable cookies to allow the server to access the session
			xfbml: true  // parse XFBML
		});
	};


	var default_user = {
		player_id: false,
		name_key: false,
		first_name: false,
		last_name: false,
		role: routingConfig.userRoles.public,
		logged_in: false
	};

	function Auth($q, ipCookie, api, AdminMenuAPI){

		var self = this;

		this.userRoles = routingConfig.userRoles;
		this.accessLevels = routingConfig.accessLevels;
		this.user = angular.copy( default_user );
		this.logging_in = $q.defer();

		

		// do whats necessary to go from the login functions to actually loged in
		function logPlayerIn(player){
			if(player.hash !== null)
				ipCookie('user_hash', player.hash, {expires: 30});

			for(i in player){
				if(i in self.user)
					self.user[i] = player[i];
			}

			self.user.role = self.getRoleForMask(self.user.role);
			self.user.logged_in = true;

			if(self.user.role.title == 'admin'){
				AdminMenuAPI.enable();
			}
		};


		/*
		 *	Check if the user has the specified access
		 *	accessLevel and role is set in js/routingConfig.js
		*/
		this.authorize = function(accessLevel, role) {
			if(role === undefined)
				role = this.user.role;

			return accessLevel.bitMask & role.bitMask;
		};

		this.isLoggedIn = function(user) {
			if(user === undefined)
				user = this.user;
			return user.role.title == userRoles.user.title || user.role.title == userRoles.admin.title;
		};

		this.getRoleForMask = function(mask){
			for(var i in this.userRoles){
				if(this.userRoles[i].bitMask == mask)
					return this.userRoles[i];
			}
			return this.userRoles.public;
		};

		// try all the different auto-login methods
		this.tryLogin = function(){
			var d = $q.defer();

			this.tryCookieLogin()
			.then(
				function(player){
					logPlayerIn(player);
					d.resolve(player);
					self.logging_in.resolve(player);
				},
				function(err){
					self.tryFacebookLogin()
					.then(
						function(player){
							logPlayerIn(player)
							d.resolve(player);
							self.logging_in.resolve(player);
						},
						function(err){
							d.reject(err);
							self.logging_in.reject(err);
						}
					);
				}
			);

			return d.promise;
		};

		// check for a cookie based login
		this.tryCookieLogin = function(){
			var d = $q.defer(),
				hash = ipCookie('user_hash');

			if(hash !== undefined){
				api.get('user.loginFromHash', hash)
				.then(
					function(player){
						d.resolve(player);
					},
					function(err){
						d.reject({
							title: 'User Not Found',
							headline: 'Are you sure you exist?',
							msg: '<p>We couldn\'t find a player that matched that information. Please try logging in manually.</p>',
							err: err
						});
					}
				);
			} else {
				d.reject({
					title: 'Not User Data Found',
					headline: 'You\'re not from around these parts, are ya?',
					msg: '<p>It doesn\'t look like you\'ve ever logged in before, or it was a long time ago. It\'s great, you have to try it.</p>',
					err: 'No cookie present or cookie has expired'
				});
			}

			return d.promise;
		};

		// maybe someone has authed the app in FB
		this.tryFacebookLogin = function(){
			var d = $q.defer();

			FB.getLoginStatus(function(rsp) {
				if (rsp.status === 'connected') {
					api.get('user.loginFromAccessToken', rsp.authResponse.accessToken)
					.then(
						function(player){
							console.log('auto logged in from facebook');
							d.resolve(player);
						},
						function(err){
							d.reject({
								title: 'Facebook Data Doesn\'t Match',
								headline: 'We can\'t seem to find you',
								msg: '<p>We don\'t seem to know about you. If you\'re on the league talk to Aron Duby</p>',
								err: err
							});
						}
					)
				} else {
					d.reject({
						title: 'Not Logged In or Not Connected',
						headline: 'Have we meet before?',
						msg: '<p>You are either not logged in to Facebook, or you haven\'t connected the App yet.</p>',
						err: 'not connected/logged in with Facebook'
					});
				}
			});
			
			return d.promise;
		};

		// actually login someone in through FB
		this.loginWithFacebook = function(){
			var d = $q.defer();

			FB.login(function(rsp){
				if (rsp.authResponse) {
					api.get('user.loginFromAccessToken', rsp.authResponse.accessToken)
					.then(
						function(player){
							logPlayerIn(player);
							d.resolve(player);
							self.logging_in.resolve(player);
						},
						function(err){
							var obj = {
								title: 'User Not Found',
								headline: 'Are you sure you exist?',
								msg: '<p>We couldn\'t find a player that matched that information. If you are on the league talk to Aron Duby.</p>',
								err: err
							};
							d.reject(obj);
							self.logging_in.reject(obj);
						}
					);
				} else {
					var obj = {
						title: 'Cancel Login?',
						headline: 'Are you sure you want to cancel the login?',
						msg: '<p>Logging in will highlight your location and is necessary to be able to keep score for the night. There\'s no special permission required and we only pull your user id to verify your identity (which we already have since you are in the group).</p>',
						err: 'cancelled FB login'
					};
					d.reject(obj);
					self.logging_in.reject(obj);
				}
			});

			return d.promise;
		};

		// login someone in through the login form
		this.loginWithForm = function(email, password){
			var d = $q.defer();

			api.get('user.loginFromForm', {'email': email, 'password': password})
			.then(
				function(player){
					logPlayerIn(player);
					d.resolve(player);
					self.logging_in.resolve(player);
				},
				function(err){
					var obj = {
						title: 'User Not Found',
						headline: 'No one was found with that information',
						msg: '<p>If you haven\'t registered yet, talk to an admin. If you have check your credentials and try again. If your problem persists, talk to an admin to reset your password.</p>',
						err: err
					};
					d.reject(obj);
					self.logging_in.reject(obj);
				}
			);

			return d.promise;
		};

	};

	

	servicesApp.service('Auth', ['$q', 'ipCookie', 'api', 'AdminMenuAPI', Auth]);

	return servicesApp;	
});