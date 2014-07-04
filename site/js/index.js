$(document).ready(function(){

	Socket.add('tiesbroken', function(updated){
		var cur_night = $('.page#index').data('night_id');

		if(cur_night == updated || cur_night == 'totals'){
			dialog({
				title: 'New Data Recieved',
				headline: 'The Ties Have Been Broken',
				msg: 'The ties have been broken, but we need to refresh the places to get the proper display order. <strong>Click "OK" to view the latest listing</strong>, or cancel to coninute what you\'re doing',
				btn:{ 
					fn: function(){
						App.loading.show();
						window.location.reload();
					}
				}
			});
		}
	});

	Socket.add('leaguenight_updated', function(night){
		dialog({
			title: 'New Data Recieved',
			headline: '"' + night.title + '" Has Been Updated',
			msg: night.title + ' has been edited, that means what you see may now be out of date until you refresh. Press <strong>OK to refresh</strong> and get the latest info or cancel to contiue without refreshing',
			btn:{ 
				fn: function(){
					App.loading.show();
					window.location.reload();
				}
			}
		});
	});

	Socket.add('season_updated', function(season){
		dialog({
			title: 'New Data Recieved',
			headline: '"' + season.title + '" Has Been Updated',
			msg: season.title + ' has been edited, that means what you see may now be out of date until you refresh. Press <strong>OK to refresh</strong> and get the latest info or cancel to contiue without refreshing',
			btn:{ 
				fn: function(){
					App.loading.show();
					window.location.reload();
				}
			}
		});
	})

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
						night_total = Scoring.players[ Scoring.name_key_to_index[name_key] ].night_score,
						season_total = Number(p.data('pre_total')) + night_total;

					// nigh the machines
					// update the totals for night and season
					$('.player-machine[data-abbv="'+data.abbv+'"] .machine-points', p).text(data.players[name_key]);
					$('.score',p)
						.find('span:eq(0)').text(night_total).end()
						.find('span:eq(1)').text(season_total);

					// wiggle it
					p.addClass('wiggle');
				}
			}
		});


		// setup the randomizer
		$('#random-panel').data('popup', new Popup($('#random-panel')));
		$('#random-panel button.again').on('click', function(){
			$('button#randomizer').triggerHandler('click');
		});
		$('button#randomizer').on('click', function(){
			App.randomMachine()
			.then(function(machine){
				var order = ['1','2','3','4'];
				$('#random-panel')
					.find('img').attr('src', machine.image).end()
					.find('h3').text(machine.name).end()
					.find('p').text(machine.abbv).end()
					.find('.order span').text( order.sort(function() { return 0.5 - Math.random() }).join(', ') ).end()
					.data('popup').open();
			});
		});

		$(this).data('inited', true);

	});


	// redraw our interface on hash change
	$('.page[data-route="index"]').on("change", function(e, hash) {

		// if hash is undefined and scoring has started
		// redirect to the night that is being scored
		if(hash == undefined){
			if(Scoring.started == true)
				hash = Scoring.starts;
			else{
				var now = new Date();

				now.setHours(0);
				now.setMinutes(0);
				now.setSeconds(0);
				now.setMilliseconds(0);
				now = now.getTime();

				for(i in App.league_nights){
					if(App.league_nights[i].date_obj){
						if(App.league_nights[i].date_obj.getTime() >= now)
							hash = i;
					}
				}
			}
		}
		
		// make sure hash is an available night
		if(App.league_nights[hash] == undefined)
			hash = 'totals';

		if($(this).data('hash') == hash){
			return true;
		} else
			$(this).data('hash', hash);

		// set night_id
		$(this).data('night_id', App.league_nights[hash].night_id);

		var page = this;
		
		// update our fake select button
		$('.nights-trigger', this)
			.find('h2').text(App.league_nights[hash].title).end()
			.find('p').text(App.league_nights[hash].desc);

		var method = 'leaguenight.',
			arg = hash;
		if(hash=='totals'){
			method += 'totals';
			arg = null;
		} else {
			method += 'starts';
		}

		var dfd = Api.get(method, arg, {
			success: function(night){
				// DIVISIONS
				var cloner = $('.division.hidden', page);

				if(night.divisions.length <= 1){
					cloner.addClass('single');
				} else {
					cloner.removeClass('single');
				}
				
				$('.division:not(.hidden)', page).remove();
				$.each(night.divisions, function(){
					var el = cloner.clone(true),
						division = this;

					// update the division title
					el.find('> header h1').text(division.title);

					// MACHINES
					if(division.machines.length > 0){
						var machine_list = $('<ul></ul>');
						for(i in division.machines){
							var machine = division.machines[i];
							machine_list.append('<li><img src="'+machine.image+'" /><h3>'+machine.name+'</h3><p>'+machine.abbv+'</p></li>');
						}
						$('.machine-holder .listview', el).empty().append(machine_list);
						if(division.machines_note){
							$('<h2>'+division.machines_note+'</h2>').insertBefore(machine_list);
						}

					} else {
						$('.machine-holder .listview', el).html('<p>no machines selected for this week</p>');
					}

					// PLAYERS
					if(division.player_list.players.length){
						var player_holder = $('.player-holder .listview', el).empty(),
							group_holder = $('<ul></ul>'),
							cur_group = division.player_list.players[0].grouping;

						for(i in division.player_list.players){
							var p = division.player_list.players[i],
								machine_points = false;

							if(p.grouping != cur_group){
								player_holder.append(group_holder);
								group_holder = $('<ul></ul>');
								cur_group = p.grouping;
							}							

							// if scoring has started and it's the same night override the machine with the data from scoring
							if(Scoring.started == true && Scoring.starts == night.starts){
								var scoring_player = Scoring.players[ Scoring.name_key_to_index[p.name_key] ];
								p.machines = scoring_player.machines;
								p.night_score = scoring_player.night_score ? scoring_player.night_score : '';
							}

							// machine places
							if(!$.isEmptyObject(p.machines)){
								machine_points = $('<div></div>');
								for(abbv in p.machines){
									machine_points.append('<span class="player-machine" data-abbv="'+abbv+'">' +
										'<span class="abbv">'+abbv+'</span>' +
										'<span class="machine-points">'+(p.machines[abbv]!='' ? p.machines[abbv] : '-')+'</span>' +
									'</span>');
								}
							}

							var score = [p.score],
								pre_total = p.score;

							if(App.league_nights[hash].future == false){
								score[0] = Number(score[0]) + Number(p.night_score);
								score.unshift(p.night_score);						
							}

							var rank_movement = 0;
							if(p.previous_rank != null)
								rank_movement = p.previous_rank - p.rank;
							
							group_holder.append(
								'<li data-name_key="'+p.name_key+'" data-pre_total="'+pre_total+'" data-scoring_string="'+p.scoring_string+'" class="'+(User.logged_in==true && User.name_key == p.name_key ? 'user starred ' : '')+(p.dnp ? 'dnp' : '')+' ">' +
									'<a href="#/players/'+p.name_key+'" title="view player info">' +
										'<h3>' +
											'<span class="rank">'+p.rank+'<span class="movement '+(rank_movement > 0 ? 'positive' : (rank_movement==0 ? 'same' : 'negative'))+'" data-movement="'+rank_movement+'">'+(rank_movement == 0 ? '' : Math.abs(rank_movement))+'</span></span>' +
											p.first_name+' '+p.last_name +
											(night.subs!=undefined && night.subs[p.name_key] != undefined ? '<span class="sub" title="sub">'+night.subs[p.name_key].sub+'</span>' : '') +
										'</h3>' +
										(machine_points != false ? '<p class="player-points">'+machine_points.html()+'</p>' : '' ) +
										'<span class="score right '+(score.length>1 ? 'double' : '')+'"><span>'+score.join('</span><span>')+'</span></span>' +
									'</a>' + 
								'</li>');
						}
						player_holder.append(group_holder);

						// add our tied class to the proper people
						// if everyone is tied don't mark them
						if($('li[data-scoring_string]', player_holder).length != $('li[data-scoring_string="0"]', player_holder).length){
							var tied_count = 0;
							player_holder.find('li').filter(function(index){
								if($(this).attr('data-tied_count')!=undefined)
									return true;

								var sstr = $(this).attr('data-scoring_string');
								if(sstr == 'undefined')
									return false;

								var tied = $('li[data-scoring_string="'+sstr+'"]', player_holder);
								if(tied.length > 1){
									tied.attr('data-tied_count', ++tied_count%2==1?'odd':'even');
									return true;
								}
								return false;
							}).addClass('tied');
						}
					} else {
						$('.player-holder .listview', page).html('<p>No player scores have been posted yet. Check back after the first week</p>');
					}

					el.removeClass('hidden').insertBefore(cloner);
				});// end division loop

				// NOTES
				$('.notes', page).html(night.note);

				// SUBS
				var subul = $('<ul/>');
				for(i in night.subs){
					subul.append('<li>'+night.subs[i].sub+' played on behalf of '+night.subs[i].player+'</li>');
				}
				$('.notes', page).append(subul);

			},
			error: function(error){
				console.log(error);
				alert('Sorry, we could not load the data. Please check your data connection.');
				App.loading.hide();
			},
			complete: function(){
				// App.loading.hide();
			}
		});

		// when live starts for today add the class, update the title, and add the machines
		// but don't set it up until the data is loaded
		dfd.then(function(){
			Scoring.add('started', function(data){
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