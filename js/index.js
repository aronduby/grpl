$(document).ready(function(){

	$('.page[data-route="index"]').on("init", function() {
		if($(this).data('inited') == true)
			return true;

		var	self = $(this);

		// setup our league night data
		var months = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"),
			nights_list = $('<ul></ul>');

		for(i in App.league_nights){
			var night = App.league_nights[i];
			nights_list.append('<li data-starts="'+night.starts+'"><a href="#/index/'+night.starts+'"><h2>'+night.title+'</h2><p>'+night.desc+'</p></a></li>');
		}
		$('#nights-panel article').empty().append(nights_list);

		// setup out nights panel
		$('#nights-panel').data('popup', new Popup($('#nights-panel')));
		$('#nights-panel').on('click', 'li[data-starts] a', function(){
			$('#nights-panel').data('popup').close();
		});

		// handle clicks to the nights btn to open our popup
		$('.nights-trigger').on('click', function(){
			$('#nights-panel').data('popup').open();
		});

		// when scoring starts add the live class to the proper li
		Scoring.add('started', function(){
			$('#nights-panel li[data-starts="'+Scoring.starts+'"]').addClass('live');
		}).add('stopped', function(){
			$('#nights-panel li.live').removeClass('live');
		}).add('updated', function(data){
			if($(self).data('hash') == data.starts){
				for(name_key in data.players){
					var p = $('.player-holder li[data-name_key="'+name_key+'"]', self),
						night_total = 0,
						season_total = Number(p.data('pre_total'));

					$('.player-machine[data-abbv="'+data.abbv+'"] .machine-points', p).text(data.players[name_key]);
					$('.machine-points', p).each(function(){
						var t = $(this).text()
						night_total += t == '-' ? 0 : Number(t);
					});
					season_total += night_total;

					$('.score',p)
						.find('span:eq(0)').text(night_total).end()
						.find('span:eq(1)').text(season_total);
				}
			}
		});

		$(this).data('inited', true);

	});


	// redraw our interface on hash change
	$('.page[data-route="index"]').on("change", function(e, hash) {
		console.log('index on change');
		
		// make sure hash is an available night
		if(App.league_nights[hash] == undefined)
			hash = 'totals';

		if($(this).data('hash') == hash){
			return true;
		} else
			$(this).data('hash', hash);

		var page = this;
		

		// update our fake select button
		$('.nights-trigger', this)
			.find('h2').text(App.league_nights[hash].title).end()
			.find('p').text(App.league_nights[hash].desc);

		var dfd = $.ajax('api/leaguenight/'+hash, {
			dataType: 'json',
			success: function(night){
				// MACHINES
				if(night.machines.length > 0){
					var machine_list = $('<ul></ul>');
					for(i in night.machines){
						var machine = night.machines[i];
						machine_list.append('<li><a href="'+machine.url+'"><img src="'+machine.image+'" /><h3>'+machine.name+'</h3><p>'+machine.abbv+'</p></a></li>');
					}
					$('.machine-holder .listview', page).empty().append(machine_list);
					if(night.machines_note){
						$('<h2>'+night.machines_note+'</h2>').insertBefore(machine_list);
					}

				} else {
					$('.machine-holder .listview', page).html('<p>no machines selected for this week</p>');
				}

				// PLAYERS
				var player_holder = $('.player-holder .listview', page).empty();
				for(i in night.players){
					var group_holder = $('<ul></ul>'),
						group = night.players[i];								
					
					for(j in group){
						var p = group[j],
							machine_points = false;

						// machine places
						if(p.machines != undefined){
							machine_points = $('<div></div>');
							for(abbv in p.machines){
								machine_points.append('<span class="player-machine" data-abbv="'+abbv+'">' +
									'<span class="abbv">'+abbv+'</span>' +
									'<span class="machine-points">'+(p.machines[abbv]!='' ? p.machines[abbv] : '-')+'</span>' +
								'</span>');
							}
						}

						var score = p.score.split(' '),
							pre_total = score[0];
						// if there's two scores the first is the total from the night
						// the second score is the total up to that night
						// so for the total at the end of the night add the two together
						if(score.length > 1){
							pre_total = score[1];
							score[1] = Number(score[0]) + Number(score[1]);
						}

						group_holder.append(
							'<li data-name_key="'+p.name_key+'" data-pre_total="'+pre_total+'" '+(User.logged_in==true && User.name_key == p.name_key ? 'class="user" ' : '')+'>' +
								'<a href="#/players/'+p.name_key+'" title="view player info">' +
									'<h3>'+p.first_name+' '+p.last_name+'</h3>' +
									(machine_points != false ? '<p class="player-points">'+machine_points.html()+'</p>' : '' ) +
									'<span class="score right '+(score.length>1 ? 'double' : '')+'"><span>'+score.join('</span><span>')+'</span></span>' +
								'</a>' + 
							'</li>');
					}
					player_holder.append(group_holder);

				}

				// NOTES
				$('.notes', page).html(night.note);

				// SUBS
				if(night.subs.length > 0){
					var subul = $('<ul/>');
					for(i in night.subs){
						subul.append('<li>'+night.subs[i].sub+' played on behalf of '+night.subs[i].player+'</li>');
					}
					$('.notes', page).append(subul);
				}

			},
			error: function(jqXHR, status, error){
				console.log(status, error);
				alert('Sorry, we could not load the data. Please check your data connection.');
			},
			complete: function(){
				// App.loading.hide();
			}
		});

		// when live starts for today add the class, update the title, and add the machines
		// but don't set it up until the ajax data is loaded
		dfd.then(function(){
			Scoring.add('started', function(){
				if(Scoring.starts == hash){
					var player_holder = $('.player-holder', page),
						listview = $('.listview', player_holder);
					
					player_holder.addClass('live')
						.find('header h1').text('Live Results');
				}

			}).add('stopped', function(){
				$('.player-holder', page).removeClass('live').find('header h1').text('Scores');
			});
		});
		
		// and make sure what we just did above doesn't stick around for every nights view
		if(Scoring.started == false || Scoring.starts != hash )
			$('.player-holder', page).removeClass('live').find('header h1').text('Scores').end().find('li p.live-scoring-points').remove().end().find('span.score').removeClass('double').find('span:eq(0)').remove();

		return dfd;

	});



	

});