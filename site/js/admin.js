$(document).ready(function(){

	Socket.add('tiesbroken', function(updated){
		if(User.admin == true){
			$('#admin-panel section.ties').hide();
		}
	});

	$.when( User.callbacks.login, App.ready ).then(function(user){
		if(user.admin == true){
			var ap = $('#admin-panel');

			// add the admin night links to our admin panel
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

			// list all of the players for editing
			var players_list = $('<ul></ul>');
			for(var name_key in App.players){
				var p = App.players[name_key];
				players_list.append('<li><a href="#/admin/users/'+name_key+'"><h3>'+p.first_name+' '+p.last_name+'</h3></a></li>');
			}
			$('.users .edit-user-list', ap).empty().append(players_list);


			// add any ties to the panel
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
							li.append(a).appendTo(tie_list);
						}

						tie_list.appendTo($('.ties .tie-groups', ap));
					}					
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the data. Please check your data connection.');
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
				window.location.hash = '/admin/users';
			});

			// manage nights button
			$('.new-league-night', ap).click(function(){
				window.location.hash = '/admin/night/new';
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
				var group_list = $('<ul></ul>'),
					machines = $('<p class="machines"></p>');

				for(var i in Scoring.machines){
					machines.append('<span class="abbv" data-abbv="'+Scoring.machines[i].abbv+'">'+Scoring.machines[i].abbv+'</span>');
				}

				for(var i in Scoring.players){
					if(i%4==0){
						if(i != 0){
							li.attr('data-name_keys', name_keys.join(' '));
							a.append(h).append(scored_machines).append('<span class="status-indicator off" data-status="'+group_status+'"></span>');
							li.append(a).appendTo(group_list);
						}
						var name_keys = [],
							li = $('<li/>'),
							a = $('<a/>'),
							h = $('<h3/>'),
							scored_machines = machines.clone(),
							scored_machines_count = 0,
							group_status = 'off';

						a.attr({
							href: '#/admin/scoring/'+Scoring.players[i].name_key,
							title: 'edit scoring'
						});

						for(var machine_i in Scoring.machines){
							if(Scoring.players[i].machines[ Scoring.machines[machine_i].abbv ]){
								scored_machines.find('span[data-abbv="'+Scoring.machines[machine_i].abbv+'"]').addClass('done');
								scored_machines_count++;
							}
						}
						if(scored_machines_count>0){
							if(scored_machines_count == Scoring.machines.length)
								group_status = 'on';
							else
								group_status = 'half';
						}
						
						// create the heading with the group number and initials
						h.append('#'+(Number(i)/4 + 1));
					}

					h.append(' '+Scoring.players[i].initials);
					name_keys.push(Scoring.players[i].name_key);
				}
				// add our last group
				li.attr('data-name_keys', name_keys.join(' '));
				a.append(h).append(scored_machines).append('<span class="status-indicator off" data-status="'+group_status+'"></span>');
				li.append(a).appendTo(group_list);

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

			// setup out players panel
			$('#night_admin-night-panel', page).data('popup', new Popup($('#night_admin-night-panel')));
			$('#night_admin-night-panel', page).on('click', 'li[data-starts] a', function(){
				$('#night_admin-night-panel').data('popup').close();
			});

			// handle clicks to the players btn to open our popup
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
			
			
			// machine selects			
			Api.get('machine', App.season_id, {
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
				player_opts += '<option value="'+name_key+'">'+App.players[name_key].first_name+' '+App.players[name_key].last_name+'</option>';
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
						machines: [],
						subs: []
					};
				$('select.machine', form).each(function(){
					data.machines.push( $(this).val() );
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
						// console.log(d);
						window.location.hash = '/index';
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
				title: 'New Night',
				date_obj: new Date(),
				note: null,
				subs: {}
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

		// existing night, load machines and subs
		form.find('option[selected]').removeAttr('selected');
		form.find('#sublist li').not('.copy').remove();
		if(night.night_id !== null){
			Api.get('leaguenight.starts', night.starts, {
				success: function(night){

					// machines
					for(var i in night.machines){
						form
							.find('select[name="machines['+i+']"]')
								.find('option[value="'+night.machines[i].abbv+'"]').attr('selected','selected');
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
			form.triggerHandler('addSub', {});		
			dfd.resolve();
		}

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
			for(name_key in App.players){
				var p = App.players[name_key];
				player_list.append('<li data-name_key="'+p.name_key+'"><a href="#/admin/users/'+p.name_key+'"><h2>'+p.first_name+' '+p.last_name+'</h2></a></li>');
			}

			$('#user_admin-users-panel article', page).empty().append(player_list);
			$('form.user-form .listview ul').html(player_list.html());

			// update our fake select button
			$('.players-trigger', this)
				.find('h2').text('Choose a User').end();
			
			page.data('inited', true);
			dfd.resolve();

			// FORM SUBMISSION
			$('form.user-form', this).on('submit', function(){
				var	form = $(this),
					data = {
						name_key: $('input[name="name_key"]', this).val(),
						first_name: $('input[name="first_name"]', this).val(),
						last_name: $('input[name="last_name"]', this).val(),
						facebook_id: $('input[name="facebook_id"]', this).val(),
						email: $('input[name="email"]', this).val(),
						password: $('input[name="password"]', this).val()
					};

				if(data.name_key == '')
					data.name_key = data.first_name+data.last_name;

				App.loading.show();
				Api.get('user.register', data, {
					success: function(success){
						App.players[name_key] = {
							'name_key': data.name_key,
							'first_name': data.first_name,
							'last_name': data.last_name,
							'facebook_id': data.facebook_id,
							'email': data.email,
							'admin': App.players[name_key].admin
						};					

						dialog({
							title: 'User updated',
							headline: 'User data has been saved',
							msg: '<p>The user\'s data has been successfully saved, they should now be able to login with the credentials that were supplied</p>'
						});

						$('input', form).val('');
						$('header h1', form).text('Choose a User');
						$('.listview ul', form).html($('#user_admin-users-panel ul').html());

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

		var page = this,
			user = App.players[name_key],
			form = $('form.user-form', this),
			listview = $('.listview ul', form).empty();

		$(this).attr('data-title', 'User Admin | '+user.first_name+' '+user.last_name+' | ');

		// update our fake select button
		$('.players-trigger', this)
			.find('h2').text(user.first_name+' '+user.last_name).end();


		$('.user-form section header h1', page).text(user.first_name+' '+user.last_name);

		$('input[name="name_key"]', form).val(name_key);
		listview.append('<li><label for="first_name">First Name</label><fieldset><input type="text" id="first_name" name="first_name" value="'+(user.first_name != null ? user.first_name : '')+'" /></fieldset></li>');
		listview.append('<li><label for="last_name">Last Name</label><fieldset><input type="text" id="last_name" name="last_name" value="'+(user.last_name != null ? user.last_name : '')+'" /></fieldset></li>');
		listview.append('<li><label for="facebook_id">Facebook ID</label><fieldset><input type="text" id="facebook_id" name="facebook_id" value="'+(user.facebook_id != null ? user.facebook_id : '')+'" /></fieldset><p>This will allow the user to login with Facebook</p></li>');
		listview.append('<li><label for="email">Email</label><fieldset><input type="email" id="email" name="email" value="'+(user.email != null ? user.email : '')+'" /></fieldset></li>');
		listview.append('<li><label for="password">Password</label><fieldset><input type="text" id="password" name="password" /></fieldset><p>DO NOT use the same password as anything important</p></li>');

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
			var next,
				now = new Date(),
				starts = null;

			// clear the time
			now.setHours(0);
			now.setMinutes(0);
			now.setSeconds(0);

			for(var i=0 in App.league_nights){
				if( App.league_nights[i].date_obj >= now ){
					starts = i;
					break;
				}
			}
			// starts can't be null
			if(starts == null){
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
			$('input[name="starts"]', this).val(starts);

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
										content += '<label for="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'">'+(p==0 ? 'DNP' : p)+'</label>';
										content += '<input type="radio" name="players['+player.name_key+']" value="'+p+'" id="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'" />';
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
