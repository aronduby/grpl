self.addEventListener('push', function(event){

	// console.log('received push message', event);

	var title = 'Scoring Updated!',
		body = 'Scoring has been updated, check out the new rankings.',
		icon = '/icons/android-chrome-192x192.png',
		tag = 'scoring-updated';

	event.waitUntil(
		self.registration.showNotification(title, {
			body: body,
			icon: icon,
			tag: tag
		})
	);

});


self.addEventListener('notificationclick', function(event){

	// console.log('notification clicked', event.notification.tag);

	// Android doesn't close the notification when you click on it  
	// See: http://crbug.com/463146  
	event.notification.close();

	// Looks to see if the current window is already open and focuses if it is
	event.waitUntil(
		clients.matchAll({ type: "window" })
		.then(function(clientList){
			for(var i=0; i<clientList.length; i++){
				var client = clientList[i];
				if(client.url == '/' && 'focus' in client)
					return client.focus();
			}

			if(clients.openWindow){
				return clients.openWindow('/');
			}
		})
	);

});