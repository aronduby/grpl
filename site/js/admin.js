$(document).ready(function(){

	Socket.add('tiesbroken', function(updated, name_key){
		if(User.admin == true){
			$('#admin-panel section.ties').find('li[data-name_key="'+name_key+'"]').remove();
			var count = $('#admin-panel section.ties .tie-groups li').length;
			if(count == 0){
				$('#admin-panel section.ties').hide();
			} else {
				$('#admin-panel section.ties header .count').text(count);
			}
		}
	});

	$.when( User.callbacks.login, App.ready ).then(function(user){
		if(user.admin == true){
			var ap = $('#admin-panel');

			// LEAGUE NIGHTS
			var nights_list = $('<ul></ul>');
			for(i in App.league_nights){
				var night = App.league_nights[i];
				if(night.starts == 'totals')
					continue;

				if(night.today == true){
					ap.find('section.scoring').show()
						.find('button.prepare-scoring').data('starts',night.starts).removeAttr('disabled');
				}

				nights_list.append('<li data-starts="'+night.starts+'"><a href="#/admin/night/'+night.starts+'"><h3>'+night.title+'</h3><p>'+night.desc+'</p></a></li>');
			}
			$('.nights .league-nights', ap).empty().append(nights_list);
			

			// PLAYERS
			Api.get('players.all', {
				success: function(players){
					var players_list = $('<ul></ul>');
					for(var i in players){
						var p = players[i],
							name_key = p.name_key;

						players_list.append('<li><a href="#/admin/users/'+name_key+'"><h3>'+p.first_name+' '+p.last_name+'</h3></a></li>');			
					}
					$('.users .edit-user-list', ap).empty().append(players_list);
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the players. Please check your data connection.');
					App.loading.hide();
				}
			});
			

			// SEASONS
			var seasons_list = $('<ul></ul>');
			for(var i in App.seasons){
				var s = App.seasons[i],
					cur = s.season_id == App.season_id;

				seasons_list.prepend('<li><a href="#/admin/seasons/'+s.season_id+'"><h3>'+s.title+'</h3>'+(s.season_id == App.season_id ? '<p>current season</p>' : '')+'</a></li>');
			}
			$('.seasons .edit-season-list', ap).empty().append(seasons_list);

			// MACHINES
			Api.get('machine.all', {
				success: function(machines){
					var machines_list = $('<ul></ul>');
					for(var i in machines){
						var m = machines[i];
						machines_list.append('<li><a href="#/admin/machines/'+m.abbv+'"><h3>'+m.name+'</h3>'+(m.active==true ? '<p>active</p>' : '')+'</a></li>');
					}
					$('.machines .edit-machine-list', ap).empty().append(machines_list);
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the machines. Please check your data connection.');
					App.loading.hide();
				}
			})



			// TIES
			Api.get('leaguenight.ties', App.next_or_most_recent_night.starts, {
				success: function(ties){

					if(ties.length > 0){
						$('section.ties', ap).show();

						$('section.ties header', ap).prepend('<span class="count red">'+ties.length+'</span>');

						var tie_list = $('<ul></ul>');
						for(i in ties){
							// add a li for every group that is tied
							// make the text be the initials (or Aron D.)
							var group = ties[i],
								li = $('<li></li>'),
								a = $('<a href="#/admin/tiebreaker/'+ties[i][0].name_key+'"></a>'),
								h3 = $('<h3></h3>'),
								names = [];

							for(var j in group){
								names.push(group[j].first_name+' '+ group[j].last_name[0]+'. ');
							}
							h3.text( names.join(' | ') );
							a.append(h3);
							li.attr('data-name_key', group[0].name_key).append(a).appendTo(tie_list);
						}

						tie_list.appendTo($('.ties .tie-groups', ap));
					}					
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the ties. Please check your data connection.');
					App.loading.hide();
				}
			});


			// setup the admin panel
			ap.data('popup', new Popup(ap));

			// show admin btn instead of logo
			$('h1.hdr-logo').hide()
			$('button.admin').show();


			$('button.admin, #admin-panel').on('click', function(){
				$('#admin-panel').data('popup').toggle();
			});

			// don't close the panel when you click on collapsible headers
			ap.on('click', '.collapsible header', function(e){
				e.stopPropagation();
				return false;
			});

			// close the panel when you click a button
			ap.on('click', 'button', function(){
				ap.data('popup').close();
				return false;
			});

			// manage user button
			$('.admin-users', ap).click(function(){
				window.location.hash = '/admin/users/new';
			});

			// manage nights button
			$('.new-league-night', ap).click(function(){
				window.location.hash = '/admin/night/new';
			});

			// manage season button
			$('.new-season', ap).click(function(){
				window.location.hash = '/admin/seasons/new';
			});

			// new machine button
			$('.new-machine', ap).click(function(){
				window.location.hash = '/admin/machines/new';
			});			

			// hookup scoring actions
			$('.prepare-scoring', ap).click(function(){
				Scoring.start($(this).data('starts'));
			});
			$('.stop-scoring', ap).click(function(){
				Scoring.stop();
			});	

			Scoring.add('started', function(data){
				ap
					.find('.prepare-scoring').hide().end()
					.find('.stop-scoring').removeAttr('disabled').show();

				// build up the group progress section
				var group_list = $('<ul></ul>');

				$.each(Scoring.divisions, function(){
					var division = this,
						machines = division.machines,
						machines_content = $('<p class="machines"></p>');

					// machines for this division
					for(var j = 0; j < machines.length; j++){
						machines_content.append('<span class="abbv" data-abbv="'+machines[j].abbv+'">'+machines[j].abbv+'</span>');
					}

					// players in this division
					var prev_grouping = false;
					for(var j = 0; j < division.player_list.players.length; j++){
						var player = division.player_list.players[j];

						// the first player for the group sets up all the html stuff
						if(player.grouping !== prev_grouping){
							// if this wasn't the first group, add the previously setup group
							if(prev_grouping !== false){
								li.attr('data-name_keys', name_keys.join(' '));
								a.append(h).append(scored_machines).append('<span class="status-indicator off" data-status="'+group_status+'"></span>');
								li.append(a).appendTo(group_list);	
							}

							var name_keys = [],
								li = $('<li/>'),
								a = $('<a/>'),
								h = $('<h3/>'),
								scored_machines = machines_content.clone(),
								scored_machines_count = 0,
								group_status = 'off';

							a.attr({
								href: '#/admin/scoring/'+player.name_key,
								title: 'edit scoring'
							});

							for(var mi = 0; mi < machines.length; mi++){
								if(player.machines[machines[mi].abbv]){
									scored_machines.find('span[data-abbv="'+machines[mi].abbv+'"]').addClass('done');
									scored_machines_count++;
								}
							}
							if(scored_machines_count>0){
								if(scored_machines_count == machines.length)
									group_status = 'on';
								else
									group_status = 'half';
							}
							
							// create the heading with the group number and initials
							h.append('#'+(Number(player.grouping) + 1));
						}

						// add the initials and the name key to the group li
						prev_grouping = player.grouping;
						h.append(' '+player.initials);
						name_keys.push(player.name_key);
					}

					// add our last group
					li.attr('data-name_keys', name_keys.join(' '));
					a.append(h).append(scored_machines).append('<span class="status-indicator off" data-status="'+group_status+'"></span>');
					li.append(a).appendTo(group_list);
				});

				$('.scoring-groups', ap).empty().append(group_list);

			}).add('updated', function(data){
				var one_player;

				for(name_key in data.players){
					one_player = name_key;
					break;
				}

				var li = $('.scoring li[data-name_keys~="'+one_player+'"]', ap);
				li
					.find('.status-indicator').attr('data-status', 'half').end()
					.find('span.abbv[data-abbv="'+data.abbv+'"]').addClass('done');

				// if all of the machines are done, switch the indiciator
				if($('p.machines span.done', li).length == $('p.machines span.abbv', li).length){
					li.find('.status-indicator').attr('data-status', 'on');
				}
			}).add('stopped', function(){
				ap
					.find('.stop-scoring').attr('disabled','disabled').hide().end()
					.find('.prepare-scoring').show().end()
					.find('.scoring-groups').empty();
			});

		}
	});



	/*
	 * --- Admin Pages
	*/
	// Night Admin
	$('.page[data-route="admin/night"]').on('init', function(){
		var dfd = $.Deferred();

		if( User.logged_in == false || User.admin == false ){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {
			if($(this).data('inited') == true)
				return true;

			var	page = $(this);

			// setup out nights panel
			$('#night_admin-night-panel', page).data('popup', new Popup($('#night_admin-night-panel')));
			$('#night_admin-night-panel', page).on('click', 'li[data-starts] a', function(){
				$('#night_admin-night-panel').data('popup').close();
			});

			// handle clicks to the nights btn to open our popup
			$('.night-trigger', page).on('click', function(){
				$('#night_admin-night-panel').data('popup').open();
			});

			// setup our panel
			var night_list = $('<ul></ul>');
			night_list.append('<li data-starts="new"><a href="#/admin/night/new"><h2>New Night</h2><p>Create a new night</p></a></li>');
			for(starts in App.league_nights){
				if(starts=='totals')
					continue;

				var n = App.league_nights[starts];
				night_list.append('<li data-starts="'+starts+'"><a href="#/admin/night/'+starts+'"><h2>'+n.title+'</h2><p>'+n.desc+'</p></a></li>');
			}

			$('#night_admin-night-panel article', page).empty().append(night_list);

			// update our fake select button
			$('.night-trigger', this)
				.find('h2').text('Choose a Night').end();


			// order button
			$('button.edit-night-order', page).on('click', function(){
				window.location = '#/admin/night/order/'+$(this).data('starts');
				return false;
			});
			
			
			// machine selects			
			Api.get('machine.active', {
				success: function(machines){
					var opts = '<option></option>';

					for(var i in machines){
						var mac = machines[i];
						opts += '<option value="'+mac.abbv+'">'+mac.abbv+': '+mac.name+'</option>';
					}

					$('select.machine', page).html(opts);

					dfd.resolve();
				}
			});

			// player selects
			var player_opts = '<option></option>';
			for(var name_key in App.players){
				var had_sub = App.players[name_key].had_sub;
				player_opts += '<option value="'+name_key+'" '+(had_sub === true ? 'disabled' : '')+'>'+App.players[name_key].first_name+' '+App.players[name_key].last_name+(had_sub ? ' (had sub)' : '')+'</option>';
			}
			$('select[name="player"]', page).html(player_opts);
			$('#sublist', page).on('click', '.remove', function(){
				$(this).parents('li:eq(0)').remove();
				return false;
			});

			page.data('inited', true);

			// FORM
			$('form.night-form', page).on('addSub', function(e, sub){
				var c = $(this).find('#sublist li.copy').clone();

				c.find('input[name="sub_id"]').val(sub.sub_id);
				c.find('select[name="player"]').val(sub.name_key);
				c.find('input[name="sub"]').val(sub.sub);

				c.removeClass('hidden copy');
				c.appendTo('#sublist ul');
			});
			$('form.night-form', page).on('click', '.add-sub', function(){
				$(this).trigger('addSub', {});
				return false;
			});

			// Add Divisions
			$('form.night-form', page).on('addDivision', function(e, div){
				var c = $(this).find('.division.copy').clone();

				c
					.find('input[name="division_id"]').val(div.division_id).end()
					.find('header h3').text(div.title);


				for(var i in div.machines){
					c
						.find('select[name="machines['+i+']"]')
							.find('option[value="'+div.machines[i].abbv+'"]').attr('selected','selected');
				}
				
				c.removeClass('hidden copy');
				c.appendTo('.machinelist-holder');
			});

			$('form.night-form', page).on('submit', function(){
				App.loading.show();

				var	form = $(this),
					data = {
						night_id: form.find('input[name="night_id"]').val(),
						season_id: form.find('input[name="season_id"]').val(),
						title: form.find('input[name="title"]').val(),
						starts: {
							month: form.find('select[name="starts[month]"]').val(),
							day: form.find('input[name="starts[day]"]').val(),
							year: form.find('input[name="starts[year]"]').val()
						},
						note: form.find('input[name="note"]').val(),
						divisions: [],
						subs: []
					},
					post_save = form.find('select[name="post-save"] > option:selected').val();

				$('.division', form).not('.copy').each(function(){
					var d = {
						division_id: $(this).find('input[name="division_id"]').val(),
						machines: []
					}

					$('select.machine', this).each(function(){
						d.machines.push( $(this).val() );
					});

					data.divisions.push(d);
				});

				$('#sublist li', form).each(function(){
					var name_key = $(this).find('select[name="player"]').val();

					if(name_key != ''){
						var sub = {
							'name_key': name_key,
							'sub_id': $(this).find('input[name="sub_id"]').val(),
							'sub': $(this).find('input[name="sub"]').val()
						};

						data.subs.push(sub);
					}
				});

				Api.post('leaguenight.update', data, {
					success: function(d){
						switch(post_save){
							case 'index':
							default:
								window.location.hash = '/index';
								break;

							case 'order':
								window.location.hash = '/admin/night/order/'+d.starts;
								break;

							case 'edit-another':
								window.location.hash = '/admin/night/new';
								break;
						}
						App.loading.hide();
					}
				});

				return false;
			});

		}

		return dfd;
	});

	$('.page[data-route="admin/night"]').on('change', function(e, starts){
		if(starts == undefined){
			return true;
		} else if($(this).data('starts') == starts){
			return true;
		} else {
			$(this).data('starts', starts);
		}

		var dfd = $.Deferred();
			page = this,
			form = $('form.night-form', this);

		if(starts == 'new'){
			var night = {
				night_id: null,
				title: 'League Night #',
				date_obj: new Date(),
				note: null,
				subs: {},
				has_order: 0
			};
			night.date_obj.setHours(0);
			night.date_obj.setMinutes(0);
			night.date_obj.setSeconds(0);
			night.date_obj.setMilliseconds(0);

		// SCORING HAS STARTED?
		} else if(Scoring.started && Scoring.starts==starts){
			dfd.reject({
				title: 'I\'m Afraid I Can\'t Let You Do That',
				headline: 'Scoring Already Started',
				msg: 'Scoring has already started for that night, so you could break lots of things. Instead, talk to Aron about what you need to do and he\'ll handle it',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;

		} else if(starts in App.league_nights){
			var night = App.league_nights[starts];

		} else {
			dfd.reject({
				title: 'Night Not Found',
				headline: 'Couldn\'t find that night',
				msg: 'A night could not be found for the passed in hash.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;
		}


		$(this).attr('data-title', 'Night Admin | '+night.title+' | ');
		$('.night-trigger', this)
			.find('h2').text(night.title).end();
		$('.night-form section header h1', page).text('Edit '+night.title);

		// general night info
		form
			.find('input[name="night_id"]').val(night.night_id).end()
			.find('input[name="season_id"]').val(App.season_id).end()
			.find('input[name="title"]').val(night.title).end()
			.find('select[name="starts[month]"]').val(night.date_obj.getMonth()+1).end()
			.find('input[name="starts[day]"]').val(night.date_obj.getDate()).end()
			.find('input[name="starts[year]"]').val(night.date_obj.getFullYear()).end()
			.find('input[name="note"]').val(night.note).end();
		

		// existing night, load machines and subs
		form.find('option[selected]').removeAttr('selected');
		form.find('#sublist li').not('.copy').remove();
		form.find('div.machinelist').not('.copy').remove();
		if(night.night_id !== null){
			Api.get('leaguenight.starts', night.starts, {
				success: function(night){

					for(var i in night.divisions){
						form.triggerHandler('addDivision', night.divisions[i]);
					}

					// subs
					i = false;
					for(i in night.subs){
						form.triggerHandler('addSub', night.subs[i]);
					}
					if(i === false)
						form.triggerHandler('addSub', {});


					dfd.resolve();
				}
			});
		} else {
			// form.triggerHandler('addSub', {});		
			// dfd.resolve();
			Api.get('division.getForSeason', App.season_id, {
				success: function(divisions){
					for(var i in divisions){
						form.triggerHandler('addDivision', divisions[i]);
					}
					dfd.resolve();
				},
				error: function(err){
					dfd.reject(err);
				}
			})
		}

		// disable the order button?
		if(night.has_order == 1){
			form
				.find('button.edit-night-order')
					.removeAttr('disabled')
					.data('starts', night.starts);
		} else {
			form.find('button.edit-night-order').attr('disabled', 'disabled');
		}

		dfd.then(function(){
			// disable the machines if it's in the past
			var today = new Date();
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setMilliseconds(0);
			if(night.night_id != null && night.date_obj < today){
				$('select.machine, input[name^="starts"], select[name^="starts"]', form).attr('disabled','disabled');
			} else {
				$('select.machine, input[name^="starts"], select[name^="starts"]', form).removeAttr('disabled');
			}
		});

		return dfd;
	});
	
	// User Order
	$('.page[data-route="admin/night/order"]').on('init', function(){
		var dfd = $.Deferred();

		if( User.logged_in == false || User.admin == false ){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {
			if($(this).data('inited') == true)
				return true;

			var	page = $(this);

			// setup out nights panel
			$('#order-admin-night-panel', page).data('popup', new Popup($('#order-admin-night-panel')));
			$('#order-admin-night-panel', page).on('click', 'li[data-starts] a', function(){
				$('#order-admin-night-panel').data('popup').close();
			});

			// handle clicks to the nights btn to open our popup
			$('.night-trigger', page).on('click', function(){
				$('#order-admin-night-panel').data('popup').open();
			});

			// setup our panel
			var night_list = $('<ul></ul>');
			night_list.append('<li data-starts="new"><a href="#/admin/night/new"><h2>New Night</h2><p>Create a new night</p></a></li>');
			for(starts in App.league_nights){
				if(starts=='totals')
					continue;

				var n = App.league_nights[starts];
				night_list.append('<li data-starts="'+starts+'"><a href="#/admin/night/'+starts+'"><h2>'+n.title+'</h2><p>'+n.desc+'</p></a></li>');
			}

			$('#order-admin-night-panel article', page).empty().append(night_list);

			// update our fake select button
			$('.night-trigger', this)
				.find('h2').text('Choose a Night').end();

			// order button
			$('button.edit-night-order', page).on('click', function(){
				console.log( $(this).data() );
				window.location = '#/admin/night/order/'+$(this).data('starts');
				return false;
			});

			// night button
			$('button.edit-night', page).on('click', function(){
				window.location = '#/admin/night/'+$(this).data('starts');
				return false;
			});


			// PlayerOrder plugin
			$('#player-order').playerOrder();


			// form
			$('form.order-form', page).on('submit', function(){
				App.loading.show();
				var order = $('#player-order').playerOrder().save();
				if(order === false){
					App.loading.hide();
					dialog({
						title: 'I Can\'t Let You Do That',
						headline: 'Error in the Groups',
						msg: 'You have at least one group with too few (< 3) or too many (> 4) players. You need to correct that before continuing.',
						btn:{ 
							fn: function(){
								App.loading.hide();
							}
						}
					});
				} else {

					var data = {
						starts: $(this).find('input[name="starts"]').val(),
						season_id: $(this).find('input[name="season_id"]').val(),
						order: order
					};

					Api.post('leaguenight.update.order', data, {
						success: function(){
							window.location.hash = '/index';
							App.loading.hide();
						}
					});
				}

				return false;
			});


			page.data('inited', true);
			dfd.resolve();
		}

		return dfd;
	});

	$('.page[data-route="admin/night/order"]').on('change', function(e, starts){
		if(starts == undefined){
			return true;
		} else if($(this).data('starts') == starts){
			return true;
		} else {
			$(this).data('starts', starts);
		}

		var dfd = $.Deferred();
			page = this,
			form = $('form.order-form', this);

		// NEW NIGHT?
		if(starts == 'new'){
			dfd.reject({
				title: 'I\'m Afraid I Can\'t Let You Do That',
				headline: 'Night Has to Exist First',
				msg: 'You must first create a night before you can edit the order for it.',
				btn:{
					fn: function(){
						window.location.hash = '/admin/night/new';
					}
				}
			});
			return dfd;

		// SCORING HAS STARTED?
		} else if(Scoring.started && Scoring.starts==starts){
			dfd.reject({
				title: 'I\'m Afraid I Can\'t Let You Do That',
				headline: 'Scoring Already Started',
				msg: 'Scoring has already started for that night, so you could break lots of things. Instead, talk to Aron about what you need to do and he\'ll handle it',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;

		} else if(starts in App.league_nights){
			var night = App.league_nights[starts];
			if(night.today == false && night.date_obj.getTime() < Date.now()){
				dfd.reject({
					title: 'I\'m Afraid I Can\'t Let You Do That',
					headline: 'Live in the Now!',
					msg: 'You can\'t edit the order for a night that already happened.',
					btn:{
						fn: function(){
							window.location.hash = '/admin/night/'+starts;
						}
					}
				});

				return dfd;
			}

		} else {
			dfd.reject({
				title: 'Night Not Found',
				headline: 'Couldn\'t find that night',
				msg: 'A night could not be found for the passed in hash.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;
		}


		$(this).attr('data-title', 'Order Admin | '+night.title+' | ');
		$('.night-trigger', this)
			.find('h2').text(night.title).end();
		$('.order-form section header h1', page).text('Edit Order for '+night.title);

		form.find('button.edit-night').data('starts', night.starts);

		// general night info
		form
			.find('input[name="starts"]').val(night.starts).end()
			.find('input[name="season_id"]').val(App.season_id).end();

		// load up the player information
		$('#player-order').empty();

		Api.get('leaguenight.order', night.starts, {
			success: function(order){
				var cur_group = 0,
					order_list = $('#player-order', page);

				for(var i = 0; i < order.players.length; ++i){
					var p = order.players[i];

					if(p.grouping != cur_group){
						order_list.append('<li class="divider disabled" data-group="'+cur_group+'">');
						cur_group = p.grouping;
						//continue;
					}

					order_list.append('<li data-name_key="'+p.name_key+'" data-rank="'+p.rank+'" class="'+(p.dnp ? 'dnp' : '')+'">' + 
						'<span class="rank">'+p.rank+'</span>' +
						'<h3>'+p.first_name+' '+p.last_name+'</h3>' +
						'<button class="x dnp yellow"></button>' +
					'</li>');
				}

				dfd.resolve();
			},
			error: function(err){
				dfd.reject(err);
			}
		});

		return dfd;
	});

	// User Admin
	$('.page[data-route="admin/users"]').on("init", function() {
		var dfd = $.Deferred();

		if(User.logged_in == false || User.admin == false){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {

			if($(this).data('inited') == true)
				return true;

			var	page = $(this);

			// setup out players panel
			$('#user_admin-users-panel', page).data('popup', new Popup($('#user_admin-users-panel')));
			$('#user_admin-users-panel', page).on('click', 'li[data-name_key] a', function(){
				$('#user_admin-users-panel').data('popup').close();
			});

			// handle clicks to the players btn to open our popup
			$('.players-trigger', page).on('click', function(){
				$('#user_admin-users-panel').data('popup').open();
			});

			// setup our panel
			var player_list = $('<ul></ul>');
			player_list.append('<li><a href="#/admin/users/new"><h2>New User</h2><p>Add a new user</p></a></li>');
			Api.get('players.all', {
				success: function(players){
					for(var i in players){
						var p = players[i],
							name_key = p.name_key;

						player_list.append('<li><a href="#/admin/users/'+name_key+'"><h3>'+p.first_name+' '+p.last_name+'</h3></a></li>');			
					}
					dfd.resolve();
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the players. Please check your data connection.');
					App.loading.hide();
					dfd.reject(err);
				}
			});

			$('#user_admin-users-panel article', page).empty().append(player_list);
			$('form.user-form .listview ul').html(player_list.html());

			// update our fake select button
			$('.players-trigger', this)
				.find('h2').text('Choose a User').end();
			
			page.data('inited', true);
			// dfd.resolve();

			// FORM SUBMISSION
			$('form.user-form', this).on('submit', function(){
				var	form = $(this),
					data = {
						name_key: $('input[name="name_key"]', this).val(),
						first_name: $('input[name="first_name"]', this).val(),
						last_name: $('input[name="last_name"]', this).val(),
						facebook_id: $('input[name="facebook_id"]', this).val(),
						email: $('input[name="email"]', this).val(),
						password: $('input[name="password"]', this).val(),
						seasons: []
					};

				$('input[name="season[]"]:checked', this).each(function(){
					data.seasons.push($(this).val());
				});

				if(data.name_key == '')
					data.name_key = data.first_name+data.last_name;

				// make sure '' becomes null
				for(var i in data){
					if(data[i] == '')
						data[i] = null;
				}

				App.loading.show();
				Api.get('user.register', data, {
					success: function(success){
						App.players[data.name_key] = {
							'name_key': data.name_key,
							'first_name': data.first_name,
							'last_name': data.last_name,
							'facebook_id': data.facebook_id,
							'email': data.email,
							// 'admin': App.players[data.name_key].admin
							'admin': data.admin
						};					

						dialog({
							title: 'User updated',
							headline: 'User data has been saved',
							msg: '<p>The user\'s data has been successfully saved, they should now be able to login with the credentials that were supplied</p>'
						});

						$('input', form).val('');
						$('header h1', form).text('Choose a User');
						// $('.listview ul', form).html($('#user_admin-users-panel ul').html());
						window.location.hash = '/admin/users';

						App.loading.hide();
					}
				});


				return false;
			});

		}

		return dfd;
	});

	$('.page[data-route="admin/users"]').on("change", function(e, name_key) {
		if(name_key == undefined){
			return true;
		} else if($(this).data('name_key') == name_key){
			return true;
		} else {
			$(this).data('name_key', name_key);
		}

		var dfd = $.Deferred(),
			page = this,
			form = $('form.user-form', this),
			listview = $('.listview ul', form).empty(),
			user_dfd = $.Deferred(),
			active_seasons = [];

		if(name_key in App.players){
			user_dfd.resolve(App.players[name_key]);
		} else if(name_key == 'new'){
			user_dfd.resolve({
				name_key: null,
				first_name: 'New',
				last_name: 'User',
				facebook_id: null,
				email: null,
				password: null
			});
		} else {
			Api.get('players.all.namekey', name_key, {
				success: function(player){
					user_dfd.resolve(player);
				},
				error: function(err){
					console.log(err);
					dfd.reject({
						title: 'Player Not Found',
						headline: 'Couldn\'t find that player',
						msg: 'A player could not be found for the passed in hash.',
						btn:{
							fn: function(){
								window.location.hash = '/index';
							}
						}
					});		
				}
			})
		}

		user_dfd
		.then(function(user){
			$(this).attr('data-title', 'User Admin | '+user.first_name+' '+user.last_name+' | ');

			// update our fake select button
			$('.players-trigger', this)
				.find('h2').text(user.first_name+' '+user.last_name).end();


			$('.user-form section header h1', page).text(user.first_name+' '+user.last_name);

			$('input[name="name_key"]', form).val(user.name_key);
			listview.append('<li><label for="first_name">First Name</label><fieldset><input type="text" id="first_name" name="first_name" value="'+(user.first_name != null ? user.first_name : '')+'" /></fieldset></li>');
			listview.append('<li><label for="last_name">Last Name</label><fieldset><input type="text" id="last_name" name="last_name" value="'+(user.last_name != null ? user.last_name : '')+'" /></fieldset></li>');
			listview.append('<li><label for="facebook_id">Facebook ID</label><fieldset><input type="text" id="facebook_id" name="facebook_id" value="'+(user.facebook_id != null ? user.facebook_id : '')+'" /></fieldset><p>This will allow the user to login with Facebook</p></li>');
			listview.append('<li><label for="email">Email</label><fieldset><input type="email" id="email" name="email" value="'+(user.email != null ? user.email : '')+'" /></fieldset></li>');
			listview.append('<li><label for="password">Password</label><fieldset><input type="text" id="password" name="password" /></fieldset><p>DO NOT use the same password as anything important</p></li>');

			// get the seasons this person was active
			var active_seasons = '';
			for(i in App.seasons){
				active_seasons += '<label for="season_'+i+'" data-group="seasons">'+App.seasons[i].title+'</label>';
				active_seasons += '<input type="checkbox" name="season[]" id="season_'+i+'" value="'+i+'" data-group="seasons" />';
			}
			listview.append('<li><label>Active Seasons</label><fieldset>'+active_seasons+'</fieldset>');
			if(user.name_key != null){
				Api.get('players.getSeasons', user.name_key, {
					success: function(season_ids){
						for(i in season_ids){
							listview.find('input#season_'+season_ids[i]).trigger('click');
						}

						dfd.resolve(true);
					}
				});
			} else {
				dfd.resolve(true);
			}
		})
		.fail(function(err){
			dfd.reject(err);
		});

		return dfd;
	});

	// Season Admin
	$('.page[data-route="admin/seasons"]').on("init", function(){
		var dfd = $.Deferred();

		if( User.logged_in == false || User.admin == false ){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {
			if($(this).data('inited') == true)
				return true;

			var	page = $(this),
				season_panel = $('#season_admin-season-panel', page);

			// SEASON PANEL
			season_panel.data('popup', new Popup(season_panel));
			season_panel.on('click', 'li[data-season_id] a', function(){
				season_panel.data('popup').close();
			});

			// handle clicks to the players btn to open our popup
			$('.season-trigger', page).on('click', function(){
				$('#season_admin-season-panel').data('popup').open();
			}).find('h2').text('Choose a Season');

			// setup our panel
			var season_list = $('<ul></ul>');
			for(var i in App.seasons){
				var s = App.seasons[i];
				season_list.prepend('<li data-season_id="'+s.season_id+'"><a href="#/admin/seasons/'+s.season_id+'"><h3>'+s.title+'</h3>'+(s.season_id == App.season_id ? '<p>current season</p>' : '')+'</a></li>');
			}
			season_list.prepend('<li data-starts="new"><a href="#/admin/seasons/new"><h2>New Season</h2><p>Create a new season</p></a></li>');

			$('article', season_panel).empty().append(season_list);

			// DIVISIONS
			$('#divisionlist', page).on('click', '.remove', function(){
				$(this).parents('li:eq(0)').remove();
				return false;
			});
			$('form.season-form', page).on('addDivision', function(e, division){
				var c = $(this).find('#divisionlist li.copy').clone();

				c.find('input[name="division_id"]').val(division.division_id);
				c.find('input[name="title"]').val(division.title);
				c.find('input[name="cap"]').val(division.cap);

				c.removeClass('hidden copy');
				c.appendTo('#divisionlist ul');
			});
			$('form.season-form', page).on('click', '.add-division', function(){
				$(this).trigger('addDivision', {});
				return false;
			});

			// FORM SUBMISSION
			$('form.season-form', page).on('submit', function(){
				App.loading.show();

				var	form = $(this),
					data = {
						season_id: form.find('input[name="season_id"]').val(),
						title: form.find('input[name="title"]').val(),
						current: form.find('input[name="current"]:checked').val()
					};

				if(data.current == undefined)
					data.current = 0;

				// add our divisions
				// check to make sure theres at least 1 division
				var divisions = [];
				form.find('#divisionlist li').not('.copy').each(function(i){
					var d = {
						division_id: $(this).find('input[name="division_id"]').val(),
						season_id: data.season_id,
						title: $(this).find('input[name="title"]').val(),
						cap: $(this).find('input[name="cap"]').val(),
						display_order: i
					};

					$.each(['division_id', 'season_id', 'cap'], function(){
						if(d[this] == ''){
							d[this] = null;
						} else {
							d[this] = Number(d[this]);
						}
					});
					divisions.push(d);
				});

				if(divisions.length < 1){
					App.loading.hide();
					dialog({
						title: 'Oops...',
						headline: 'Add a Division',
						msg: 'You have to have at least 1 division per season for things to work',
					});
					return false;
				}

				data.divisions = divisions;
				
				Api.post('season.update', data, {
					success: function(d){
						window.location.hash = '/index';
						App.loading.hide();
					},
					error: function(err){
						App.loading.hide();
						dialog(err);
					}
				});

				return false;
			});

			dfd.resolve();
			$(this).data('inited', true);
		}

		return dfd;
	});

	$('.page[data-route="admin/seasons"]').on("change", function(e, season_id){
		if(season_id == undefined){
			return true;
		} else if($(this).data('season_id') == season_id){
			return true;
		} else {
			$(this).data('season_id', season_id);
		}

		var dfd = $.Deferred();
			page = this,
			form = $('form.season-form', this),
			season = null;

		if(season_id == 'new'){
			// new season
			season = {
				season_id: null,
				title: 'New Season',
				current: false,
				divisions: []
			};
			dfd.resolve();
			
		} else if(season_id in App.seasons){
			// known season
			season = App.seasons[season_id];
			if(App.seasons[season_id].season_id == App.season_id)
				season.current = true;
			else
				season.current = false;

			// load the divisions
			form.find('#divisionlist li').not('.copy').remove();
			Api.get('division.getForSeasonNoPlayers', season_id, {
				success: function(divisions){
					i = false;
					for(i in divisions){
						form.triggerHandler('addDivision', divisions[i]);
					}
					if(i === false)
						form.triggerHandler('addDivision', {});

					dfd.resolve();
				},
				error: function(err){
					dfd.reject(err);
				}
			});

		} else {
			// not found
			dfd.reject({
				title: 'Season Not Found',
				headline: 'Couldn\'t find that season',
				msg: 'A season could not be found for the passed in hash.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;
		}

		$(this).attr('data-title', 'Season Admin | '+season.title+' | ');
		$('.season-trigger', this)
			.find('h2').text(season.title).end();
		$('.season-form section header h1', page).text('Edit '+season.title);

		// general night info
		form
			.find('input[name="season_id"]').val(season.season_id).end()
			.find('input[name="title"]').val(season.title).end()
			.find('label[for="current_'+(season.current ? 'yes' : 'no')+'"]').trigger('click').end();

		return dfd;
	});

	// Machine Admin
	$('.page[data-route="admin/machines"]').on("init", function(){
		var dfd = $.Deferred();

		if( User.logged_in == false || User.admin == false ){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {
			if($(this).data('inited') == true)
				return true;

			var	page = $(this),
				machine_panel = $('#machine_admin-machine-panel', page);

			// MACHINE PANEL
			machine_panel.data('popup', new Popup(machine_panel));
			machine_panel.on('click', 'li[data-machine_id] a', function(){
				machine_panel.data('popup').close();
			});

			// handle clicks to the machine btn to open our popup
			$('.machine-trigger', page).on('click', function(){
				$('#machine_admin-machine-panel').data('popup').open();
			}).find('h2').text('Choose a Machine');

			Api.get('machine.all', {
				success: function(machines){
					var machines_list = $('<ul></ul>');
					for(var i in machines){
						var m = machines[i];
						machines_list.append('<li data-machine_id="'+m.machine_id+'"><a href="#/admin/machines/'+m.abbv+'"><h3>'+m.name+'</h3>'+(m.active == true ? '<p>active</p>' : '')+'</a></li>');
					}
					machines_list.prepend('<li data-machine_id="new"><a href="#/admin/machines/new"><h2>New Machine</h2><p>Add a new machine</p></a></li>');
					$('article', machine_panel).empty().append(machines_list);

					dfd.resolve(true);
				},
				error: function(err){
					dfd.reject(err);
				}
			});

			// FORM SUBMISSION
			$('form.machine-form', page).on('submit', function(){
				App.loading.show();

				var	form = $(this),
					data = {
						machine_id: form.find('input[name="machine_id"]').val(),
						image: form.find('input[name="image"]').val(),
						name: form.find('input[name="name"]').val(),
						abbv: form.find('input[name="abbv"]').val(),						
						new_url: form.find('input[name="new_url"]').val(),
						note: form.find('input[name="note"]').val(),
						active: form.find('input[name="active"]:checked').val()
					};

				
				Api.post('machine.update', data, {
					success: function(d){
						window.location.hash = '/index';
						App.loading.hide();
					},
					error: function(err){
						console.log(err);
					}
				});

				return false;
			});

			$(this).data('inited', true);
		}

		return dfd;
	});

	$('.page[data-route="admin/machines"]').on("change", function(e, abbv){
		if(abbv == undefined){
			return true;
		} else if($(this).data('abbv') == abbv){
			return true;
		} else {
			$(this).data('abbv', abbv);
		}

		var dfd = $.Deferred();
			page = this,
			form = $('form.machine-form', this),
			machine_dfd = $.Deferred();

		if(abbv == 'new'){
			// new machine
			machine_dfd.resolve({
				machine_id: null,
				name: null,
				abbv: null,
				image: null,
				note: null,
				active:null
			});
		} else {
			Api.get('machine.abbv', abbv, {
				success: function(machine){
					machine_dfd.resolve(machine);
				},
				error: function(err){
					console.log(err);
					machine_dfd.reject({
						title: 'Machine Not Found',
						headline: 'Couldn\'t find that machine',
						msg: 'A machine could not be found for the passed in hash.',
						btn:{
							fn: function(){
								window.location.hash = '/index';
							}
						}
					});
				}
			});
		}

		machine_dfd
		.then(function(machine){
			$(this).attr('data-title', 'Machine Admin | '+machine.name+' | ');
			$('.machine-trigger', this)
				.find('h2').text(machine.name).end();
			$('.machine-form section header h1', page).text('Edit '+machine.name);

			// general machine info
			form
				.find('input[name="machine_id"]').val(machine.machine_id).end()
				.find('input[name="image"]').val(machine.image).end()
				.find('input[name="name"]').val(machine.name).end()
				.find('input[name="abbv"]').val(machine.abbv).end()
				.find('img.thumb').attr('src', machine.image).end()
				.find('input[name="note"]').val(machine.note).end()
				.find('label[for="active_'+(machine.active ? 'yes' : 'no')+'"]').trigger('click').end();

			dfd.resolve(true);
		})
		.fail(function(err){
			dfd.reject(err);
		});

		return dfd;
	});


	// Tiebreaker
	$('.page[data-route="admin/tiebreaker"]').on("init", function() {
		var dfd = $.Deferred();

		if(User.logged_in == false || User.admin == false){
			dfd.reject({
				title: 'Admins Only',
				headline: 'You must be an admin',
				msg: 'This page is only accessible to the admins, please talk to them if you need help.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {
			if($(this).data('inited') == true)
				return true;

			var	page = $(this);

			// figure out which league night we should set the starts to
			var next = null,
				starts = null,
				d = new Date(),
				today = new Date(d.getFullYear(), d.getMonth(), d.getDate()),
				future = [];

			for(var i=0 in App.league_nights){
				if(App.league_nights[i].date_obj!=false){
					if(App.league_nights[i].date_obj.getTime() >= today )
						future.push( App.league_nights[i] );
				}
			}
			next = future.pop();
			starts = next.starts;

			// starts can't be null
			if(next == null){
				dfd.reject({
					title: 'Cant\'t Break Ties',
					headline: 'No Usable League Night Found to Break Ties',
					msg: 'You have to have an upcoming night to be able to break ties. Enter one into the system before trying to do this again.',
					btn:{
						fn: function(){
							window.location.hash = '/index';
						}
					}
				});
				return dfd;
			}
			$('input[name="night_id"]', this).val(next.night_id);
			$('input[name="starts"]', this).val(next.starts);

			// confirmed checkbox
			$('input[name="confirmed"]', this).on('change', function(){
				var status = $(this).is(':checked') ? 'on' : 'off';

				$('.confirmed-indicator', page).removeClass('on off').addClass(status).attr('data-status', status);

				if(status == 'on'){
					$('button[type="submit"]', page).removeAttr('disabled');
				} else {
					$('button[type="submit"]', page).attr('disabled', 'disabled');
				}
			});

			//
			//	FORM SUBMISSION
			//
			$('form.tiebreaker-form', this).on('submit', function(){
				$('button[type="submit"]', this).attr('disabled', 'disabled');
				$('input[name="confirmed"]').removeAttr('checked').trigger('change');

				App.loading.show();

				// make sure there aren't any repeated places or not assigned places
				var errors = [];

				$('.tie-section', this).each(function(){
					var checked = $('input:checked', this),
						title = $('h1',this).text();

					// make sure everyone has a score
					if(checked.length != $('li', this).length)
						errors.push( title + ' are missing some scores' );

					// make sure they have different values
					var values = [];
					checked.each(function(){
						if( $.inArray($(this).val(), values) >= 0){
							errors.push( title + ' have some repeated scores' );
						}
						values.push( $(this).val() );
					});
				});

				if(errors.length > 0){
					App.loading.hide();
					dialog({
						title:'Scoring Error',
						headline: 'You have the following error(s):',
						msg: '<ul><li>'+errors.join('</li><li>')+'</li></ul>'
					});
					$('button[type="submit"]').removeAttr('disabled');
					return false;
				}

				// format our data
				var d = {
					starts: $('input[name="starts"]', this).val(),
					night_id: $('input[name="night_id"]', this).val(),
					players: []
				};

				$('input:checked', this).each(function(){
					d.players.push({
						'name_key': $(this).data('player'), 
						'place': $(this).val()
					});
				});

				Api.post('tiebreaker', d, {
					success: function(){
						window.location.hash = '/index';
					}
				});

				return false;
			});

			dfd.resolve();
			$(this).data('inited', true);
		}

		return dfd;
	});

	$('.page[data-route="admin/tiebreaker"]').on("change", function(e, name_key){
		var dfd = $.Deferred(),
			page = this;

		Api.get('leaguenight.ties', App.next_or_most_recent_night.starts, {
			success: function(ties){
				if(ties.length > 0){
					var group;

					// find the group specified by the name_key
					group_finder:
					for(var i in ties){
						for(var j in ties[i]){
							if(ties[i][j].name_key == name_key){
								group = ties[i];
								break group_finder;
							}
						}
					}

					if(group != undefined){
						var	section = $('.tie-section.hidden', page).clone(),
							list = section.find('ul'),
							places = group.length,
							names = [];

						for(var j in group){
							var player = group[j],
								p = 1;
							
							var content = '<li data-namekey="'+player.name_key+'">';
								content += '<h2>'+player.first_name+' '+player.last_name+'</h2>';
								content += '<fieldset>';
									while(p <= places){
										content += '<label for="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'" data-group="'+player.name_key+'">'+(p==0 ? 'DNP' : p)+'</label>';
										content += '<input type="radio" name="players['+player.name_key+']" value="'+p+'" id="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'" data-group="'+player.name_key+'" />';
										p++;
									}

								content += '</fieldset>';
							content += '</li>';
							list.append(content);

							names.push(player.first_name+' '+ player.last_name[0]+'. ');
						}
						section.find('header h1').text( names.join(' | ') );
						$('.section-holder', page).empty();
						section.removeClass('hidden').appendTo( $('.section-holder', page) );

						dfd.resolve();

					} else {
						dfd.reject({
							title: 'Group Not Found',
							headline: 'Group Not Found',
							msg: 'We did not find anyone tied with that user, did you choose the wrong person? Click OK to head back to the homepage and try again.',
							btn:{
								fn: function(){
									window.location.hash = '/index';
								}
							}
						});
					}
				} else {
					dfd.reject({
						title: 'No Ties',
						headline: 'The Server Didn\'t Report Any Ties',
						msg: 'The server said no one is tied, are you here by mistake? Click OK to go back to the homepage.',
						btn:{
							fn: function(){
								window.location.hash = '/index';
							}
						}
					});
				}
			},
			error: function(error){
				console.log(error);
				alert('Sorry, we could not load the data. Please check your data connection.');
				App.loading.hide();
			}
		});

		return dfd;
	});



});
