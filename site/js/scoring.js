var Scoring = $.extend({}, $.PubSub, {

	callbacks:{
		started: $.Deferred(),
		stopped: $.Deferred(),

		logged_in: $.Callbacks(),
		updated: $.Callbacks()
	},

	started: false,
	starts: false,
	machines: [],
	players: [],
	name_key_to_index: {},
	logged_in_users: [],

	emitIfStarted: function(){
		Socket.emit('scoring.emitIfStarted');
	},

	start: function(starts){
		if(!starts){
			alert('No date was supplied to Scoring.start');
			return false;
		}
		Socket.emit('scoring.start', starts); 
	},
	stop: function(){ Socket.emit('scoring.stop'); },

	whenStarted: function(data){
		$.extend(true, this, data);
		for(var i =0 in this.players){
			this.name_key_to_index[this.players[i].name_key] = i;
		}
		this.callbacks.started.resolve(data);
	},
	stopped: function(data){
		this.started = false;
		this.starts = false;
		this.machines = [];
		this.groups = [];
		this.logged_in_users = [];

		this.callbacks.stopped.resolve(data);
	},
	logged_in: function(user){
		this.logged_in_users.push(user);
		this.callbacks.logged_in.fire(user);
	},

	
	login: function(){
		// should we check if someone else is logged in?
		Socket.emit('scoring.login', function(){
			// switch to the scoring page
			window.location.hash = '#/scoring';
		});
	},

	submit: function(data){
		var dfd = $.Deferred(),
			self = this;

		Socket.emit('scoring.update', data, function(data){
			self.callbacks.updated.fire(data);
			dfd.resolve(true);
		});

		return dfd;
	},

	getGroupForUser: function(name_key){
		var dfd = $.Deferred();

		Socket.emit('scoring.getGroupForUser', name_key, function(err, data){
			if(err){ dfd.reject(err); return false; }
			dfd.resolve(data);
		});

		return dfd;
	}

});

// join our socket and scoring
Socket.add('scoring_started', function(data){ Scoring.whenStarted.apply(Scoring, data); });
Socket.add('scoring_stopped', function(data){ Scoring.stopped.apply(Scoring, data); });
Socket.add('scoring_logged_in', function(data){ 
	Scoring.logged_in.apply(Scoring, [data]); 
});
Socket.add('scoring_update', function(data){ Scoring.callbacks.updated.fire(data); });

Scoring.add('updated', function(data){
	// loop through the players in data and update their player info in Scoring.players
	for(var name_key in data.players){
		var sp = Scoring.players[ Scoring.name_key_to_index[name_key] ],
			night_score = 0;
		sp.machines[data.abbv] = Number(data.players[name_key]);
		
		for(var i in Scoring.machines){
			night_score += Number(sp.machines[ Scoring.machines[i].abbv ])
		}
		sp.night_score = night_score;
		// sp.night_score = Number(sp.night_score ? sp.night_score : 0) + Number(data.players[name_key]);
	}
});

$(document).ready(function(){

	// when the user is logged in and the scoring has started
	$.when(User.callbacks.login, Scoring.callbacks.started).then(function(){
		// queue it to make sure we're past the welcome message
		$('.user-area').queue(function(n){
			$('button.scoring', $(this)).on('click', function(){
				Scoring.login();
			}).show();
			$(this).fadeIn();
			n();
		});
	});

	Scoring.add('stopped', function(){
		$('.user-area').queue(function(n){
			$('button.scoring', $(this)).hide();
			n();
		});
	});


	// check if scoring has already started
	Scoring.emitIfStarted();

	//
	//	PAGE SETUP
	//

	$('.page[data-route="scoring"]').on("init", function(e, data) {
		var inited = $(this).data('inited');
		if(inited == true && (data == undefined || data.name_key == undefined || data.name_key == $(this).data('name_key')))
			return true;

		var dfd = $.Deferred(),
			page = this;

		if(Scoring.started == false){ //&& User.admin == false){
			dfd.reject({
				title: 'Scoring Not Started',
				headline: 'Scoring Hasn\'t been started yet',
				msg: 'This page is only accessible when scoring has been started for a League Night. Please try again when that has happened.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else {

			if(data != undefined && User.name_key != data.name_key && User.admin == false){
				dfd.reject({
					title: 'Admins Only',
					headline: 'This page is admins only',
					msg: 'Looks like you happened upon an admin only page and you\'re not an admin. Click "OK" to head back to the homepage.',
					btn:{
						fn: function(){
							window.location.hash = '/index';
						}
					}
				});
			} else if(data != undefined && data.name_key != undefined && User.admin == true && User.name_key != data.name_key) {
				var score_user = data.name_key,
					machine_url = '#/admin/scoring/'+data.name_key;
			} else {
				var score_user = User.name_key;
					machine_url = '#/scoring';
			}

			var page = this,
				group = Scoring.getGroupForUser(score_user),
				machine_list = $('<ul></ul>');
		
			// MACHINE PANEL
			group.then(function(g){
				for(i in g.machines){
					var machine = g.machines[i];
					machine_list.append('<li data-offset="'+i+'" data-abbv="'+machine.abbv+'">' +
						'<a href="'+machine_url+'/'+i+'">' +
							'<h2>'+machine.name+'</h2>' +
							'<p>'+machine.abbv+'</p>' +
							'<span class="status-indicator" data-status="'+(g.players[0].machines[machine.abbv] ? 'on' : 'off')+'"></span>' +
						'</a>' +
					'</li>');
				}
				$('#scoring-machine-panel article').empty().append(machine_list);
			});

			// setup our machine panel
			// only do this if we aren't already inited
			if(inited !== true){
				$('#scoring-machine-panel').data('popup', new Popup($('#scoring-machine-panel')));
				$('#scoring-machine-panel').on('click', 'li[data-abbv]', function(){
					$('#scoring-machine-panel').data('popup').close();
				});
				$('.machines-trigger', this).on('click', function(){
					$('#scoring-machine-panel').data('popup').open();
				});
			}

			// LIVE RESULTS PANEL
			var dfd = Api.get('leaguenight.starts', Scoring.starts, {
				success: function(night){
					// PLAYERS
					var player_holder = $('.player-holder .listview', page).empty(),
						group_holder = $('<ul></ul>'),
						j = 0;

					for(i in night.players){
						if(j%4 == 0 && j != 0){
							player_holder.append(group_holder);
							group_holder = $('<ul></ul>');
						}
						
						var p = night.players[j],
							machine_points = false;

						// if scoring has started and it's the same night override the machine with the data from scoring
						if(Scoring.started == true && Scoring.starts == night.starts){
							var scoring_player = Scoring.players[ Scoring.name_key_to_index[p.name_key] ];
							p.machines = scoring_player.machines;
							p.night_score = scoring_player.night_score ? scoring_player.night_score : '';
						}

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

						var score = [p.score],
							pre_total = p.score;

						if(p.night_score != undefined){
							score[0] = Number(score[0]) + Number(p.night_score);
							score.unshift(p.night_score);						
						}

						group_holder.append(
							'<li data-name_key="'+p.name_key+'" data-pre_total="'+pre_total+'" '+(User.logged_in==true && User.name_key == p.name_key ? 'class="user" ' : '')+'>' +
								'<h3>'+p.first_name+' '+p.last_name+'</h3>' +
								(machine_points != false ? '<p class="player-points">'+machine_points.html()+'</p>' : '' ) +
								'<span class="score right '+(score.length>1 ? 'double' : '')+'"><span>'+score.join('</span><span>')+'</span></span>' +
							'</li>');
						j++;
					}
					player_holder.append(group_holder);
				},
				error: function(error){
					console.log(error);
					alert('Sorry, we could not load the data. Please check your data connection.');
				}
			});
			
			// figure out the base for the next machine
			// do it here outside of the init check so it can change every time
			if(data != undefined && data.name_key != undefined && User.name_key != data.name_key && User.admin == true)
				App.next_scoring_url_base = '/admin/scoring/'+score_user+'/';
			else
				App.next_scoring_url_base = '/scoring/';

			// only do this if we aren't already inited
			if(inited !== true){
				// setup our live results machine panel
				$('#scoring-live-panel').data('popup', new Popup($('#scoring-live-panel')));
				$('#scoring-live-panel').on('click', function(){
					$('#scoring-live-panel').data('popup').close();
				});
				$('.live-results-trigger', this).on('click', function(){
					$('#scoring-live-panel').data('popup').open();
				});

				Scoring.add('updated', function(data){
					for(name_key in data.players){
						var p = $('.player-holder li[data-name_key="'+name_key+'"]', page),
							night_total = Scoring.players[ Scoring.name_key_to_index[name_key] ].night_score,
							season_total = Number(p.data('pre_total')) + night_total;

						// nigh the machines
						// update the totals for night and season
						$('.player-machine[data-abbv="'+data.abbv+'"] .machine-points', p).text(data.players[name_key]);
						$('.score',p)
							.find('span:eq(0)').text(night_total).end()
							.find('span:eq(1)').text(season_total);
					}
				});

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
				$('form.scoring-form', this).on('submit', function(){
					$('button[type="submit"]', this).attr('disabled', 'disabled');
					$('input[name="confirmed"]').removeAttr('checked').trigger('change');

					App.loading.show();

					// make sure there aren't any repeated places or not assigned places
					var errors = [],
						error_msgs = {
							1: 'You have multiple people marked as 1st',
							2: 'You have multiple people marked as 2nd',
							3: 'You have multiple people marked as 3rd',
							4: 'You have multiple people marked as 4th',
						},
						places = {1:false, 2:false, 3:false, 4:false},
						checked = $('input[type="radio"]:checked', this),
						dnps = $('input[type="radio"][value="0"]:checked');

					if(checked.length < 4){
						errors.push('There should be 4 scores submitted, you only have '+checked.length+'.');
					}

					// if we have DNPs make the lower X places as obtained
					// that way you can't have a 4th place and a DNP
					if(dnps.length > 0){
						var keys = [4,3,2,1];
						for(i=0; i<dnps.length; i++){
							places[keys[i]] = true;
							error_msgs[keys[i]] = 'Your DNP player counts as '+keys[i];
						}
					}

					checked.each(function(){
						var val = $(this).val();
						// you can have multiple DNPs
						if(val == 0)
							return true;// ?

						if(places[val] == false){
							places[val] = true;
						} else {
							var msg = error_msgs[val];
							if(errors.indexOf(msg) == -1)
								errors.push(msg);
						}
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

					// everything is good, format our data
					var points = [0,7,5,3,1],
						offset = $('input[name="current-offset"]').val(),
						d = {
							starts: $('input[name="starts"]').val(),
							abbv: $('input[name="abbv"]').val(),
							players: {}
						};

					// do we need to change the points value based on the # of DNPs?
					switch(dnps.length){
						case 0:
							break;
						case 1:
						default:
							points = [0,7,4,1,0];
							break;
					}

					$('input[type="radio"]:checked').each(function(){
						d.players[$(this).data('player')] = points[$(this).val()];
					});

					Scoring.submit(d)
					.then(function(){
						if($('#scoring-machine-panel li[data-abbv="'+d.abbv+'"] .status-indicator').data('status') != 'on')
							$('#scoring-machine-panel li[data-abbv="'+d.abbv+'"] .status-indicator').attr('data-status', 'on');
						
						var machines_not_on = $('#scoring-machine-panel li:has(.status-indicator[data-status!="on"])');
						if(machines_not_on.length > 0){
							window.location.hash = App.next_scoring_url_base+(machines_not_on.eq(0).data('offset'));
						} else {
							window.location.hash = '/index/'+d.starts;
						}
						
					});

					

					return false;
				});
			
			}// end inited check
			
			$(this).data('inited', true);
			$(this).data('name_key', score_user);
		}

		return dfd;
	});


	$('.page[data-route="scoring"]').on('change', function(e, data){
		var offset = (data == undefined ? 0 : (data.offset == undefined ? 0 : data.offset));

		if(data != undefined && User.name_key != data.name_key && User.admin == false){
			dfd.reject({
				title: 'Admins Only',
				headline: 'This page is admins only',
				msg: 'Looks like you happened upon an admin only page and you\'re not an admin. Click "OK" to head back to the homepage.',
				btn:{
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
		} else if(data != undefined && data.name_key != undefined && User.admin == true) {
			var score_user = data.name_key;
		} else {
			var score_user = User.name_key;
		}
		

		var dfd = $.Deferred(),
			page = this,
			group = Scoring.getGroupForUser(score_user);

		group.then(function(group){
			var Machine = group.machines[offset];

			$(page).attr('data-title', 'Scoring | '+Machine.abbv+' | ');

			var points = [-1,7,5,3,1,0];

			// update our fake select button
			$('.machines-trigger', page)
				.find('h2').text(Machine.name).end()
				.find('p').text(Machine.abbv);


			$('.scoring-form section header h1', page).text(Machine.name);

			// machine notes
			$('.machine-notes', page).empty();
			if(Machine.note != 'null')
				$('.machine-notes', page).text(Machine.note).show();
			else
				$('.machine-notes', page).hide();

			
			$('input[name="starts"]', page).val(Scoring.starts);
			$('input[name="current-offset"]', page).val(offset);
			$('input[name="abbv"]', page).val(Machine.abbv);


			// players order
			var tmp = group.players.slice(0).reverse(),
				player_order = tmp.slice(offset).concat(tmp.slice(0,offset)),
				places = [1,2,3,4,0],
				player_list = $('<ul></ul>');

			for(i in player_order){
				var player = $.extend(player_order[i], App.players[player_order[i].name_key]),
					content = '',
					player_place = false;

				if(player.machines[Machine.abbv]){
					player_place = $.inArray(Number(player.machines[Machine.abbv]), points);;
					if(player_place == -1)
						player_place = false;
				}

				content = '<li data-namekey="'+player.name_key+'">';
					content += '<span class="number">'+(Number(i)+1)+'</span>';
					content += '<h2>'+player.first_name+' '+player.last_name+'</h2>';
					content += '<fieldset>';
					
						for(j in places){
							var p = places[j];
							content += '<label for="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'">'+(p==0 ? 'DNP' : p)+'</label>';
							content += '<input type="radio" name="players['+player.name_key+']" value="'+p+'" id="'+player.name_key+'_'+p+'" data-player="'+player.name_key+'" '+(player_place==(p == 0 ? 5 : p) ? 'checked="checked"' : '' )+' />';
							// j++;
						}

					content += '</fieldset>';
				content += '</li>';
				
				player_list.append(content);
			}
			$('.players', page).empty().append(player_list);
			// trigger the change event on all of the radios incase we have values
			$('input[type="radio"]:checked', page).trigger('change');

			// find the next machine
			var machines_not_on = $('#scoring-machine-panel li:has(.status-indicator[data-status!="on"])');
			if(machines_not_on.length > 0){
				var j = 0;
				while(machines_not_on.eq(j).data('abbv') == Machine.abbv && j < machines_not_on.length)
					j++;

				if(machines_not_on.eq(j).length == 0)
					$('button[type="submit"]', page).text('Save and Exit');
				else	
					$('button[type="submit"]', page).text(machines_not_on.eq(j).data('abbv'));
			} else {
				$('button[type="submit"]', page).text('Save and Exit');
			}

			// set the status indicator on the machine list
			if(tmp[0].machines[Machine.abbv]){
				$('#scoring-machine-panel li[data-abbv="'+Machine.abbv+'"] .status-indicator').attr('data-status', 'on');
			} else {
				$('#scoring-machine-panel li[data-abbv="'+Machine.abbv+'"] .status-indicator').attr('data-status', 'half');
			}

			dfd.resolve();
		})
		.fail(function(err){
			alert(err);
			return false;
		}).done();
		
		return dfd;

	}); // end change


}); // end dom ready