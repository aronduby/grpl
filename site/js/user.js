
var User = $.extend({}, $.PubSub, {
	logged_in: false,
	name_key: null,
	first_name: null,
	last_name: null,
	admin: false,

	callbacks:{
		login: $.Deferred()
	},

	tryLogin: function(){
		var self = this,
			fb_login;

		$.when( this.tryCookieLogin() )
			.then(function(d){
				self.logPlayerIn(d);
			}).fail(function(err){
				console.log(err);
				$.when( self.tryFacebookLogin() )
					.then(function(d){
						self.logPlayerIn(d);
					}).fail(function(err){
						console.log(err);
						self.callbacks.login.notify();
					});
			});

	},

	tryCookieLogin: function(){
		var dfd = $.Deferred(),
			hash = $.cookie('user_hash');

		if(hash != undefined){
			Socket.emit('user.loginFromHash', hash, function(err, player){
				if(err){
					dfd.reject('User not found for that hash: '+err);
				} else {
					dfd.resolve(player);
				}
			});
		} else {
			dfd.reject('No cookie present or cookie has expired');
		}

		return dfd;
	},

	tryFacebookLogin: function(){
		var self = this,
			dfd = $.Deferred();

		window.fbAsyncInit = function() {
			FB.init({
				appId: '554891544539566', // App ID
				channelUrl : 'http://www.grpl.info/channel.html', // Channel File
				status: true, // check login status
				cookie: true, // enable cookies to allow the server to access the session
				xfbml: true  // parse XFBML
			});

			FB.getLoginStatus(function(rsp) {
				if (rsp.status === 'connected') {
					Socket.emit('user.loginFromAccessToken', rsp.authResponse.accessToken, function(err, player){
						if(err){
							dfd.reject('Facebook id doesn\'t match a known user: '+err);
						} else {
							console.log('auto logged in from facebook');
							dfd.resolve(player);
						}
					});
				} else {
					dfd.reject('not connected/logged in with Facebook');
				}
			});
		};
		// Load the SDK Asynchronously
		(function(d){
			var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
			if (d.getElementById(id)) {return;}
			js = d.createElement('script'); js.id = id; js.async = true;
			js.src = "//connect.facebook.net/en_US/all.js";
			ref.parentNode.insertBefore(js, ref);
		}(document));


		return dfd;
	},

	loginWithFacebook: function(){
		var self = this;

		FB.login(function(rsp){
			if (rsp.authResponse) {
				Socket.emit('user.loginFromAccessToken', rsp.authResponse.accessToken, function(err, player){
					if(err){
						dialog({
							title: 'User Not Found',
							headline: 'Are you sure you exist?',
							msg: '<p>We couldn\'t find a player that matched that information. If you are on the league talk to Aron Duby.</p>'
						});
					} else {
						console.log('user logged in with facebook');
						self.logPlayerIn(player);
					}
				});
			} else {
				dialog({
					title: 'Cancel Login?',
					headline: 'Are you sure you want to cancel the login?',
					msg: '<p>Logging in will highlight your location and is necessary to be able to keep score for the night. There\'s no special permission required and we only pull your user id to verify your identity (which we already have since you are in the group).</p>',
					btn: {
						text: 'Login',
						fn: function(){
							$('button.login:eq(0)').trigger('click');
						}
					}
				})
			}
		});
	},

	loginWithForm: function(email, password){
		var self = this;
		App.loading.show();
		Socket.emit('user.loginFromForm', email, password, function(err, player){
			if(err){
				App.loading.hide();
				dialog({
					title: 'User Not Found',
					headline: 'No one was found with that information',
					msg: '<p>If you haven\'t registered yet, talk to an admin. If you have check your credentials and try again. If your problem persists, talk to an admin to reset your password.</p>'
				});
			} else {
				console.log('user logged in with email/password');
				self.logPlayerIn(player);
				App.loading.hide();
			}
		});
	},

	logPlayerIn: function(player){
		// save the hash in a cookie for next time
		if(player.hash !== null)
			$.cookie('user_hash', player.hash, {expires: 30});

		for(i in player){
			if(i in this)
				this[i] = player[i];
		}
		this.logged_in = true;
		this.callbacks.login.resolve(this);
	}

});

// use a Deferred Object to call our Users login after socket has connected
Socket.add('connect', function(socket_rsp){
	console.log('Socket connected, and user '+(User.logged_in?'IS':'IS NOT')+' logged in');
	if(User.logged_in == false)
		User.tryLogin();
});

$(document).ready(function(){

	// setup the login form
	var login_form = $('#login-panel');
	login_form.data('popup', new Popup(login_form));
	$('form', login_form).on('submit', function(){
		var email = $('input[name="email"]').val(),
			password = $('input[name="password"]').val();

		User.loginWithForm(email, password);

		return false;
	});
	$('button.usr-btn', login_form).on('click', function(){
		$('form', login_form).submit();
		return false;
	});
	$('button.fb_login', login_form).on('click', function(){
		User.loginWithFacebook();
		return false;
	});


	User.add('login', function(user){
		$('#login-panel').data('popup').close();
		$('button.login').hide();
		$('.user-area').append('<p class="welcome-msg">Welcome '+user.first_name+'</p>').delay(2000).fadeOut(function(){
			$('.welcome-msg', this).remove();
		});
	});


	// our fb_login Deferred triggers progress when it's heard back from facebook
	// and the user is not logged in or not approved our app
	User.callbacks.login.progress(function(){
		$('button.login').show();
	});

	
	// the login button
	$('button.login').on('click', function(){
		login_form.data('popup').open();
	});
	

});