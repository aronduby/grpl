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
					last_pushed = false;

				for(var i in data){
					var p = new Date(data[i].pushed),
						pushed_date = months[p.getMonth()]+' '+p.getDate()+', '+p.getFullYear();

					if(last_pushed != pushed_date){
						if(last_pushed != false){
							$('.content', self).append(copy);
							copy = $('.pushed.hidden', self).clone().removeClass('hidden');
						}
						
						copy.find('h2').text( pushed_date );
					}

					var	c = new Date(data[i].committed),
						// committed = months[c.getMonth()]+' '+c.getDate()+', '+c.getFullYear()+' @ '+c.getHours()+':'+c.getMinutes();
						committed = c.toLocaleString();
					
					copy.find('ul').append('<li><h3>'+data[i].msg+'</h3><p>committed: '+committed+'</p><span class="right">'+data[i].commit_id+'</span></li>');

					last_pushed = pushed_date;
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