$(document).ready(function(){

	$('.page[data-route="players"]').on("init", function() {
		if($(this).data('inited') == true)
			return true;

		var	page = $(this);

		// setup out players panel
		$('#players-panel', page).data('popup', new Popup($('#players-panel')));
		$('#players-panel', page).on('click', 'li[data-name_key] a', function(){
			$('#players-panel').data('popup').close();
		});

		// handle clicks to the players btn to open our popup
		$('.players-trigger', page).on('click', function(){
			$('#players-panel').data('popup').open();
		});

		// setup our player panel & comparison select
		var player_list = $('<ul></ul>'),
			compare_to = $('#machines-compare-to');
		for(name_key in App.players){
			var p = App.players[name_key];
			player_list.append('<li data-name_key="'+p.name_key+'"><a href="#/players/'+p.name_key+'"><h2>'+p.first_name+' '+p.last_name+'</h2></a></li>');
			compare_to.append('<option value="'+p.name_key+'">'+p.first_name+' '+p.last_name+'</option>');
		}

		// comparison select change
		compare_to.change(function(e){
			$(this).blur();
			var chart = $('#players-machines-chart'),
				val = $('option:selected').val();

			if(val == ''){
				chart.removeClass('comparison')
					.find('div.comparison').remove();
			} else {
				chart.addClass('comparison').find('div.comparison').remove();
				App.loading.show();
				Api.get('players.namekey', val, {
					success: function(data){

						// update the legend
						$('.legend .compared-to', chart).text(data.player.first_name);

						// update the chart
						var machines = data.machines;
						for(i in machines){
							var tr = $('tr.'+machines[i].abbv, chart);

							if(tr.length ==0){
								tr = $('<tr class="'+machines[i].abbv+'"><th>'+machines[i].abbv+'</th><td><div class="comparison"></div></td></tr>').appendTo(chart);
							}

							var comparison = $('div.comparison', tr);
							if(comparison.length == 0){
								// var td = tr.find('td');
								comparison = $('<div class="comparison"></div>').appendTo(tr.find('td'));
							}

							var width = ((50 * Number(machines[i].points))/7);
							comparison.append('<div class="'+(machines[i].sub!=null ? 'sub' : '')+'" style="width:'+width+'%;">'+machines[i].points+'</div>');
						}
					},
					error: function(jqXHR, status, error){
						console.log(status, error);
						alert('Sorry, we could not load the data. Check to make sure you have an active data connection.');
					},
					complete: function(){
						App.loading.hide();
					}
				});
			}
			


			return false;
		});

		$('#players-panel article', page).empty().append(player_list);

		// toggle visibility of the chart plots
		$('fieldset.points, fieldset.place', page).on('click', function(){
			var chart = $('#players-nights-chart').data('chart');
				show = !$(this).data('visible'),
				series = ($(this).data('series')+'').split(','); // make sure it treats it like a string

			for(i in series){
				chart.series[series[i]].show = show;
			}
			$(this).data('visible', show);
			$(this).attr('data-visible', show);
			chart.replot();

		});

		// "collapsibles" for the head-to-head list items
		$('.head-to-head-holder').on('click', 'li > header', function(){
			$(this).parents('li').toggleClass('open');
		});
		
		page.data('inited', true);
	});

	// redraw our interface on hash change
	$('.page[data-route="players"]').on("change", function(e, name_key) {

		if(App.players[name_key] == undefined){
			var dfd = $.Deferred();
			dfd.reject({
				title: 'Player Not Found',
				headline: 'We Couldn\'t Find That Player',
				msg: 'That player could not be found in the season you are viewing. Either they didn\'t play that season or you followed a bad link. Click OK to return to the homepage.',
				btn: {
					text: 'Ok',
					fn: function(){
						window.location.hash = '/index';
					}
				}
			});
			return dfd;
		}

		if($(this).data('name_key') == name_key){
			App.loading.hide();
			return true;
		} else
			$(this).data('name_key', name_key);

		var page = this;

		$(this).attr('data-title', 'Players | '+App.players[name_key].first_name+' '+App.players[name_key].last_name+' | ');

		// update our fake select button
		$('.players-trigger', this)
			.find('h2').text(App.players[name_key].first_name+' '+App.players[name_key].last_name).end();

		// disable the current player in the comparison
		$('#players-machines-chart')
			.removeClass('comparison')
			.find('div.comparison').remove().end()
			.find('.legend .player').text(App.players[name_key].first_name);
		$('#machines-compare-to')
			.find('option[disabled]').removeAttr('disabled').end()
			.find('option[value="'+name_key+'"]').attr('disabled','disabled');


		// set our chart togglers to on
		$('fieldset', page).data('visible', true);
		$('fieldset', page).attr('data-visible', true);

		// get the main data
		var dfd = Api.get('players.namekey', name_key, {
			success: function(data){
				var player = data.player,
					place = player.rank,
					total_points = data.total_points,
					machines = data.machines,
					nights = data.nights,
					places = data.places,
					nights_holder = $('.nights-holder', page),
					machine_holder = $('.machine-holder', page);

				nights_holder
					.find('fieldset.points span').text(total_points).end()
					.find('fieldset.place span').text($.jqplot.ordinal('',place)).end();

				// nights chart
				var points = {
						player: [],
						sub: [],
						places: []
					},
					months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
					j = 1,
					night_list = $('<ul></ul>');

				if(nights.length){ for(i in nights.reverse()){
					points.player.push([j, Number(nights[i].points)]);
					
					// figure out the place we ended up in at the end of the night
					var end_place = 0;
					if(nights[j] == undefined){
						end_place = places.totals;
					} else {
						end_place = places[nights[j].starts];
					}
					points.places.push([j, end_place]);


					// if there's a sub for this week treat it as a part of the second series
					if(nights[i].sub != null)
						points.sub.push([j, Number(nights[i].points)]);
					
					var dateobj = new Date(nights[i].starts+'T00:00:00-05:00');
						
					night_list.append('<li>' +
						'<a href="#/index/'+nights[i].starts+'" title="view week">' +
							'<h2>' +
								nights[i].title + 
								(nights[i].sub != null ? '<span class="sub" title="sub">'+nights[i].sub+'</span>' : '') +
							'</h2>' +
							'<p>'+(months[dateobj.getUTCMonth()] + ' ' + dateobj.getUTCDate().cardinal() + ', ' + dateobj.getUTCFullYear())+'</p>' +
							'<span class="score right double">' +
								'<span>'+nights[i].points+'</span>' +
								'<span>'+$.jqplot.ordinal('', end_place)+'</span>' +
							'</span>' +
						'</a></li>');
					j++;
				}} else {
					night_list.append('<li><p>no nights played yet</p></li>');
				}

				// charts have to be drawn when shown so dump the data as json into the chart div
				$('#players-nights-chart-data').empty().text(JSON.stringify(points));
				$('.listview', nights_holder).empty().append(night_list);


				// machines chart
				var chart = $('#players-machines-chart tbody').empty(),
					machine_list = $('<ul></ul>');
				if(machines.length){ for(i in machines){
					var tr = $('tr.'+machines[i].abbv, chart);

					if(tr.length ==0){
						tr = $('<tr class="'+machines[i].abbv+'"><th><abbv title="'+machines[i].name+'">'+machines[i].abbv+'</abbv></th><td></td></tr>').appendTo(chart);
					}
					var width = ((50 * Number(machines[i].points))/7);
					tr.find('td').append('<div class="'+(machines[i].sub!=null ? 'sub' : '')+'" style="width:'+width+'%;">'+machines[i].points+'</div>');
					
				}} else {
					machine_list.append('<li><p>no machines played yet</p></li>');
				}
				
				$('.listview', machine_holder).empty().append(machine_list);

			},
			error: function(jqXHR, status, error){
				console.log(status, error);
				alert('Sorry, we could not load the data. Please check your data connection.');
			},
			complete: function(){
				// App.loading.hide();
			}
		});

		var headToHeads = {
			'players.headToHead': '#head-to-head',
			'players.headToHeadAllTime': '#head-to-head-all-time'
		};

		for(var method in headToHeads){
			Api.get(method, name_key, {
				success: function(data){
					var players = data.players,
						machines = data.machines,
						this_player = players[name_key],
						ul = $('<ul></ul>'),
						id = headToHeads[this.method];

					delete players[name_key];

					for(var opp_name_key in players){
						var opp = players[opp_name_key],
							win = 0,
							loss = 0,
							li = $('<li data-name_key="'+opp_name_key+'"><header><h1>'+opp.first_name+' '+opp.last_name+' <span class="record"></span></h1></header><div class="content"></div></li>'),
							table = $('<table></table>');

						table.appendTo(li.find('.content'));

						for(var abbv in opp.machines){
							for(var starts in opp.machines[abbv]){
								var p_score = this_player.machines[abbv][starts],
									o_score = opp.machines[abbv][starts],
									short_starts = starts.match(/(\d{4})-0?(\d{1,2})-0?(\d{1,2})/);

								short_starts = short_starts[2]+'/'+short_starts[3]+'/'+short_starts[1];

								if(p_score > o_score){
									win++;
								} else {
									loss++;
								}

								var row = '<tr class="'+(p_score > o_score ? 'won' : 'lost')+'">';
									row += '<th><abbv title="'+machines[abbv]+'">'+abbv+'</abbv></th>';
									row += '<td class="league_night">';
										if(method == 'players.headToHead'){
											row += '<span class="title">'+App.league_nights[starts].title+'</span>';
											row += '<span class="short-starts">'+short_starts+'</span>';
										} else {
											row += '<span>'+short_starts+'</span>';
										}
									row += '</td>';
									row += '<td class="scores">';
										row += '<div class="this-player" data-points="'+p_score+'">'+p_score+'</div>';
										row += '<div class="opponent" data-points="'+o_score+'">'+o_score+'</div>';
									row += '</td>';
								row += '</tr>';
								table.append(row);
							}
						}

						li.find('.record')
							.text(win+'-'+loss)
							.addClass( win > loss ? 'winning' : (win == loss ? 'tied' : 'losing'));

						ul.append(li);					
					}

					$(id).empty().append(ul);

				},
				error: function(err){
					console.log(err);
					$('.listview', $(id)).html('<p>Sorry, but we were unable to load this information</p>');
				}
			});
		}

		// work on the head2head seperately
		
		
		return dfd;
	});

	$('.page[data-route="players"]').on('show', function(){
		var points = JSON.parse($('#players-nights-chart-data').text());
		$('#players-nights-chart').empty();
		try{		
			var chart = $.jqplot('players-nights-chart', [points.places, points.player, points.sub], {
				title: {
					text: 'POINTS/PLACE PER LEAGUE NIGHT',
					fontFamily: 'Roboto Condensed',
					fontWeight: 'bold',
					textColor: '#515151'
				},
				seriesDefaults: {
					pointLabels: { show:true }
				},
				series:[
					// series 1 is the place at the end of that night
					{
						yaxis: 'y2axis',
						color: '#D3C9A9',
						lineWidth: 4,
						shadow: false,
						markerOptions: {
							show: true,
							size: 8,
							shadow: false
						},
						pointLabels: {
							location: 's',
							formatString: '%s (%%)',
							formatter: $.jqplot.ordinal
						}
					},
					// series 2 - points for that night
					{
						color: '#699DB1'
					},
					// series 3 is sub points so style it different
					{
						pointLabels: {show: false},
						showLine: false,
						markerOptions:{
							color:'#8DB27B'
						}
					}
				],
				axes:{
					xaxis: {
						tickOptions: {
							showGridline: false
						},
						showTicks: false
					},
					y2axis: {
						min: 33,
						max: 0,
						showTicks: false,
						tickOptions: {
							showGridline: false
						}
					}
				},
				grid: {
					shadow:false,
					background: 'transparent'
				}
			});
			$('#players-nights-chart').data('chart', chart);
		}catch(e){
			$('#players-nights-chart').hide();
			console.log(e);
		}
	});


	$(window).on('resize', function(){
		if( $('.page[data-route="players"]').is(':visible') )
			$('.page[data-route="players"]').trigger('show');
	});


	

});

(function($){
	$.jqplot.ordinal = function(format, val){
		// from http://ecommerce.shopify.com/c/ecommerce-design/t/ordinal-number-in-javascript-1st-2nd-3rd-4th-29259
		var s=["th","st","nd","rd"],
			v=val%100;
		return val+(s[(v-20)%10]||s[v]||s[0]);
	};
})(jQuery);