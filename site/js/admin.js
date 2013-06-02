$(document).ready(function(){

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


			// setup the admin panel
			ap.data('popup', new Popup(ap));
			$('button.admin, #admin-panel').on('click', function(){
				$('#admin-panel').data('popup').toggle();
			});

			// show admin btn instead of logo
			$('h1.hdr-logo').hide()
			$('button.admin').show();

			// close the panel when you click something
			ap.on('click', 'button', function(){
				ap.data('popup').close();
				return false;
			});

			// manage user button
			$('.admin-users', ap).click(function(){
				window.location.hash = '/admin/users';
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
		console.log('admin/users on change');

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

		console.log(user);

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

});