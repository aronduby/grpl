$(document).ready(function(){
	
	$('.page[data-route="changelog"]').on("init", function() {
		if($(this).data('inited') == true)
			return true;

		var	self = $(this);

		// setup out nights panel
		$('#changelog-panel').data('popup', new Popup($('#changelog-panel')));
		$('#changelog-panel').on('click', function(){
			$('#changelog-panel').data('popup').close();
		});

		// handle clicks to the nights btn to open our popup
		$('.nights-trigger').on('click', function(){
			$('#changelog-panel').data('popup').open();
		});

		// load our changelog
		var dfd = Api.get('changelog', null, {
			success: function(data){

				var copy = $('.pushed.hidden', self).clone().removeClass('hidden'),
					months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
					pushed = false;

				for(var i in data){
					if(pushed != data[i].pushed){
						if(pushed != false){
							$('.content', self).append(copy);
							copy = $('.pushed.hidden', self).clone().removeClass('hidden');
						}

						var p = new Date(data[i].pushed);
						copy.find('h2').text( months[p.getMonth()]+' '+p.getDate()+', '+p.getFullYear() );
					}

					var	c = new Date(data[i].committed),
						committed = months[c.getMonth()]+' '+c.getDate()+', '+c.getFullYear()
					
					copy.find('ul').append('<li><h3>'+data[i].msg+'</h3><p>created: '+committed+'</p><span class="right">'+data[i].commit_id+'</span></li>');

					pushed = data[i].pushed;
				}
				$('.content', self).append(copy);

			},
			error: function(error){
				console.log(error);
				alert('Sorry, we could not load the data. Please check your data connection.');
				App.loading.hide();
			}
		});


		$(this).data('inited', true);
		return dfd;
	});

});