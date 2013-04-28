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
				$.ajax({
					url: 'api/players/'+val,
					dataType: 'json',
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
				})
			}
			


			return false;
		});

		$('#players-panel article', page).empty().append(player_list);
		
		page.data('inited', true);

	});


	// redraw our interface on hash change
	$('.page[data-route="players"]').on("change", function(e, name_key) {
		console.log('players on change');

		if($(this).data('name_key') == name_key){
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

		var dfd = $.ajax({
			url: 'api/players/'+name_key,
			dataType: 'json',
			success: function(data){

				var player = data.player,
					place = data.place,
					total_points = data.total_points,
					machines = data.machines,
					nights = data.nights,
					nights_holder = $('.nights-holder', page),
					machine_holder = $('.machine-holder', page);

				nights_holder
					.find('fieldset.points span').text(total_points).end()
					.find('fieldset.place span').text(place).end();

				// nights chart
				var points = {
						player: [],
						sub: []
					},
					months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
					j = 1,
					night_list = $('<ul></ul>');
				for(i in nights.reverse()){
					points.player.push([j, Number(nights[i].points)]);

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
							'<span class="score right">'+nights[i].points+'</span>' +
						'</a></li>');
					j++;
				}
				// charts have to be drawn when shown so dump the data as json into the chart div
				$('#players-nights-chart').empty().text(JSON.stringify(points));
				$('.listview', nights_holder).empty().append(night_list);


				// machines chart
				var chart = $('#players-machines-chart tbody').empty(),
					machine_list = $('<ul></ul>');
				for(i in machines){
					var tr = $('tr.'+machines[i].abbv, chart);

					if(tr.length ==0){
						tr = $('<tr class="'+machines[i].abbv+'"><th><abbv title="'+machines[i].name+'">'+machines[i].abbv+'</abbv></th><td></td></tr>').appendTo(chart);
					}
					var width = ((50 * Number(machines[i].points))/7);
					tr.find('td').append('<div class="'+(machines[i].sub!=null ? 'sub' : '')+'" style="width:'+width+'%;">'+machines[i].points+'</div>');
					

					var dateobj = new Date(machines[i].starts+'T00:00:00-05:00');
					machine_list.append('<li>' + 
						'<h2>' +
							machines[i].name + 
							(machines[i].sub != null ? '<span class="sub" title="sub">'+machines[i].sub+'</span>' : '') +
						'</h2>' +
						'<p>'+(months[dateobj.getUTCMonth()] + ' ' + dateobj.getUTCDate().cardinal() + ', ' + dateobj.getUTCFullYear())+'</p>' +
						'<span class="score right">'+machines[i].points+'</span>' +
					'</li>');
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
		})
		
		return dfd;

	});


	$('.page[data-route="players"]').on('show', function(){
		var points = JSON.parse($('#players-nights-chart').text());
		$('#players-nights-chart').empty();
		$.jqplot('players-nights-chart', [points.player, points.sub], {
			title: {
				text: 'POINTS PER LEAGUE NIGHT',
				fontFamily: 'Roboto Condensed',
				fontWeight: 'bold',
				textColor: '#515151'
			},
			seriesDefaults: {
				pointLabels: { show:true }
			},
			series:[
				{}, // default for first series
				// series 2 is sub points so style it different
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
				}
			},
			grid: {
				shadow:false,
				background: 'transparent'
			}
		});

	})



	

});