/*
 *	Based on http://updates.html5rocks.com/2015/03/push-notificatons-on-the-open-web
*/
define([], function(){
	'use strict';

	var app = angular.module('PushService', []);


	// This method handles the removal of subscriptionId in Chrome 44 
	// by concatenating the subscription Id to the subscription endpoint
	// only needed till Chrome 44 is out
	function endpointWorkaround(pushSubscription){

		// little future proofing to make sure we only work with GCM
		if(pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0){
			return pushSubscription.endpoint;
		}

		var merged_endpoint = pushSubscription.endpoint;

		// Chrome 42 + 43 will not have subscriptionId attached to the endpoint
		if(pushSubscription.subscriptionId && pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1){
			merged_endpoint = pushSubscription.endpoint + '/' + pushSubscription.subscriptionId;
		}

		return merged_endpoint;
	};



	function Push(worker_path, subscriber, $rootScope){
		var self = this;

		this.subscribed = false;
		this.disabled = true;
		this.working = false;

		// initialize
		if('serviceWorker' in navigator){
			navigator.serviceWorker.register(worker_path)
			.then(function(){
				// Are Notifications supported in the service worker?  
				if(! ('showNotification' in ServiceWorkerRegistration.prototype)){
					console.warn('Notifications aren\'t supported');
					return false;
				}

				// Check the current Notification permission.  
				// If its denied, it's a permanent block until the user changes the permission  
				if(Notification.permission === 'denied'){
					console.warn('The user has blocked notifications');
					return false;
				}

				// Check if push messaging is supported  
				if(! ('PushManager' in window)){
					console.warn('Push messaging isn\'t supported');
					return false;
				}

				// Get the service worker registration to check for a subscription
				navigator.serviceWorker.ready.then(function(serviceWorkerRegistration){
					// Do we already have a push message subscription?
					serviceWorkerRegistration.pushManager.getSubscription()
					.then(function(subscription){

						// we can finally change our disabled state now
						$rootScope.$apply(function(){
							self.disabled = false;
						});

						if(!subscription){
							return;
						}

						// user is subscribed already

						// send the subscription to the server to keep the db up to date
						subscriber.subscribe(endpointWorkaround(subscription));

						$rootScope.$apply(function(){
							self.subscribed = true;
						});
					})
					.catch(function(err){
						console.warn('Error during getSubscription()', err);
					});
				});				
			});
		} else {
			console.warn('Service workers aren\'t supported in this browser');
		}


		this.subscribe = function(){
			// temporarily disable the button
			this.disabled = true;
			this.working = true;

			navigator.serviceWorker.ready.then(function(serviceWorkerRegistration){
				serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
				.then(function(subscription){
					// horray!
					$rootScope.$apply(function(){
						self.subscribed = true;
						self.disabled = false;
						self.working = false;
					});					

					// Send the subscription subscription.endpoint to the server for saving
					subscriber.subscribe(endpointWorkaround(subscription));

				})
				.catch(function(err){
					if(Notification.permission === 'denied'){
						// user straight denied us, they would have to manually change permissions now
						console.warn('Permission for Notifications was denied');
						$rootScope.$apply(function(){
							self.disabled = true;
							self.subscribed = false;
							self.working = false;
						});
					} else {
						// some other problem, likely gcm_ fields in manifest
						console.warn('Unable to subscribe to push', err);
						$rootScope.$apply(function(){
							self.disabled = true;
							self.subscribed = false;
							self.working = false;
						});
					}
				});
			});			
		};


		this.unsubscribe = function(){
			// temporarily disable the button
			this.disabled = true;
			this.working = true;

			navigator.serviceWorker.ready.then(function(serviceWorkerRegistration){
				// To unsubscribe from push messaging, you need get the subscription object, which you can call unsubscribe() on.  
				serviceWorkerRegistration.pushManager.getSubscription()
				.then(function(subscription){
					if(!subscription){
						// not subscribed, allow the user to subscribe
						self.disabled = false;
						self.subscribed = false;
						self.working = false;
						return;
					}

					// Send subscription.endpoint to the server for deleting
					subscriber.unsubscribe(endpointWorkaround(subscription));

					// user is subscribed so unsubscribe them
					subscription.unsubscribe()
					.then(function(){
						$rootScope.$apply(function(){
							self.disabled = false;
							self.subscribed = false;
							self.working = false;
						});						
					})
					.catch(function(err){
						// We failed to unsubscribe, this can lead to an unusual state
						// may be best to remove the users data from your data store
						console.warn('Unsubscription error', err);
						$rootScope.$apply(function(){
							self.disabled = false;
							self.subscribed = false;
							self.working = false;
						});						
					});
				})
				.catch(function(err){
					console.warn('Error thrown while unsubscribing', err);
				});
			});
		};

		// helper function to easily switch states in the controller
		this.change = function(){
			if(this.subscribed){
				this.unsubscribe()
			} else {
				this.subscribe();
			}
		}

	}

	app.provider('Push', function pushProvider(){
		var worker_path = '/service-worker.js',
			subscriber = {
				subscribe: function(endpoint){
					console.log('subscribe', endpoint);
				},
				unsubscribe: function(endpoint){
					console.log('unsubscribe', endpoint);
				}
			};

		this.setWorker = function(path){
			worker_path = path;
		};

		this.setSubscriber = function(obj){
			subscriber = obj;
		}

		this.$get = ['$rootScope', function($rootScope){
			return new Push(worker_path, subscriber, $rootScope);
		}];
	})
	
	return app;

});