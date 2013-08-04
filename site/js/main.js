var App = {

	league_nights: {}, // all of the league nights
	players: {},
	season_id: 3,
	ready: $.Deferred(), // triggered once we have all of our needed info loaded

	init: function(){

		this.loading.show();

		// grab all of the league nights
		var lnl = Api.get('leaguenight', {
			success: function(nights){
				var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
					today = new Date();

				for(i in nights){
					var night = nights[i],
						desc = '';

					if(night.starts == 'totals'){
						night.desc = 'Running Total for the Season';
						night.date_obj = false;
					} else {
						var starts = new Date(night.starts+'T00:00:00-05:00');
						night.desc = months[starts.getUTCMonth()] + ' ' + starts.getUTCDate().cardinal() + ', ' + starts.getUTCFullYear();
						night.date_obj = starts;

						// if its today add the start scoring button to the admin panel
						var is_today = (
							starts.getMonth() == today.getMonth()
							&& starts.getDate() == today.getDate()
							&& starts.getFullYear() == today.getFullYear()
						);
						if(is_today == true){
							night.today = true;
						} else {
							night.today = false;
						}
					}

					App.league_nights[night.starts] = night;
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

		// grab all of our players
		// get all of our players info
		var pl = Api.get('players', this.season_id, {
			success: function(players){
				for(i in players){
					App.players[players[i].name_key] = players[i];
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

		
		$.when( lnl, pl ).then(function(){
			App.ready.resolve(); 
		});

		return this.ready.promise();
		
	}, // end init



	// handle the loading animation
	loading: {
		show: function(){
			$('body').addClass('loading');
		}, 
		hide: function(){
			$('body').removeClass('loading');
		}
	}
};

var router,
	new_route = '',
	current_route = '',
	route_change = function(page, data){
		App.loading.show();
		var dfd = $.Deferred();

		new_route = page;
		$.when( $('.page[data-route="'+page+'"]').triggerHandler('init', data) ).then(function(){
			$.when( $('.page[data-route="'+page+'"]').triggerHandler('change', data) )
				.then(function(){
					// console.log('changed', data, dfd);
					document.title = $('.page[data-route="'+page+'"]').attr('data-title')+' GRPL';
					dfd.resolve();
				}).fail(function(err){
					App.loading.hide();
					dialog(err);
				});
		}).fail(function(err){
			App.loading.hide();
			dialog(err);
		});

		return dfd;

	}
	router = Router({
		'/index': {
			'/(totals|[\\d-]+)': {
				on: function(night, next){
					$.when( route_change('index', night) ).then(next);
				}
			},
			on: function(next){
				$.when( route_change('index') ).then(next);
			}
		},

		'/scoring': {
			'/(\\d)': {
				on: function(offset, next){
					$.when( route_change('scoring', {'offset':offset}) ).then(next);		
				}
			},
			on: function(next){
				$.when( route_change('scoring') ).then(next);
			}
		},

		'/players': {
			'/(.+)': {
				on: function(name_key, next){
					$.when( route_change('players', name_key) ).then(next);
				}
			},
			on: function(next){
				$.when( route_change('players') ).then(next);
			}
		},

		'/changelog': {
			on: function(next){
				$.when( route_change('changelog') ).then(next);
			}
		},

		'/admin':{
			'/users':{
				'/(.+)': {
					on: function(name_key, next){
						$.when( route_change('admin/users', name_key) ).then(next);
					}
				},
				on: function(next){
					$.when( route_change('admin/users') ).then(next);
				}
			},
			'/scoring':{
				'/([a-zA-Z]+)': {
					on: function(name_key, next){
						$.when( route_change('scoring', {'name_key':name_key}) ).then(next);
					},

					'/(\\d)': {
						on: function(name_key, offset, next){
							$.when( route_change('scoring', {'name_key':name_key, 'offset': offset}) ).then(next);
						}
					}
				}
			},
			'/tiebreaker':{
				'/([a-zA-z]+)': {
					on: function(name_key, next){
						$.when( route_change('admin/tiebreaker', name_key) ).then(next);	
					}
				},
				on: function(next){
					$.when( route_change('admin/tiebreaker') ).then(next);
				}
			},
			'/night':{
				'/(new|[\\d-]+)': {
					on: function(starts, next){
						$.when( route_change('admin/night', starts) ).then(next);
					}
				}
			}
		}
			
	});


router.configure({
	// used on every route
	on: function() {
		// console.log('router on', current_route, new_route);
		var page = $('.page[data-route="'+new_route+'"]');
		if(new_route != current_route){
			var pages = $('div.page');

			if(page.length) {
				pages.hide();
				page.show();
				current_route = new_route;
			}				
		}
		page.triggerHandler('show');
		window.scrollTo(0,0);
		App.loading.hide();
	},
	// recurse: 'forward',
	async: true
});

$(document).ready(function() {

	$.when( App.init() ).then(function(){
		router.init('/index');
	});


	// COLLAPSIBLES
	$('.collapsible header').on('click', function(){
		$(this).parent().toggleClass('closed');
	});

	// FORMS
	// it would appear that the change event for the inputs are propagating up to the page
	// which is then getting screwed by the page's change event
	// so here we negate that by having any change event from the form (or children)
	// stop at the form
	$('form').on('change', function(e){
		e.stopPropagation();
	});
	// radio buttons update the label
	$('form').on('change', 'input[type="radio"], input[type="checkbox"]', function(){
		// remove all checked
		$('label[data-player="'+$(this).data('player')+'"]').removeClass('checked');
		// add checked for this one
		$('label[for="'+$(this).attr('id')+'"]').addClass('checked');
	});

	// WIGGLER
	// add the wiggle css class to any element to wiggle it
	// this function removes the wiggle class when it's done wiggling
	// then we can add the class later on and it will happen again
	$('body').on('animationend webkitAnimationEnd MSAnimationEnd oanimationend', '.wiggle', function(e){
		$(this).removeClass('wiggle');
	});


	// add a generic echo callback
	Socket.add('echo', function(msg){
		console.log(msg);
	}).add('error', function(err){
		var dialog_opts = {
			title: 'Error',
			headline: 'Server reported the following error',
			msg: err,
			btn:{ class: 'close' }
		};

		console.log(err);
		App.loading.hide();
		if(err.msg != undefined){
			dialog_opts = $.extend(true, dialog_opts, err);
		}
		dialog(dialog_opts);
	}).add('disconnect', function(){
		dialog({
			title: 'Disconnected',
			headline: 'Connection to the server lost',
			msg: 'You\'ve been disconnected from the server. Click "OK" to refresh and try to reconnect.',
			btn:{ 
				fn: function(){
					App.loading.show();
					window.location.reload();
				}
			}
		});
	})

});



function dialog(opts){
	var defaults = {
			title: 'Title',
			headline: '',
			msg: '',
			additional_class: '',
			btn: {
				text: 'Ok',
				class: '',
				fn: function(){
					return true;
				}
			}
		};

	opts = $.extend(true, defaults, opts);
	
	if(opts.btn != false){
		var btn = $('<button class="usr-btn '+opts.btn.class+'"><span class="title">'+opts.btn.text+'</span></button>').on('click', opts.btn.fn).wrap('<div></div>');
	}

	var popup = $(
		'<div class="popup center dialog '+opts.additional_class+'">' +
			'<header>' +
				'<h1>'+opts.title+'</h1>' +
				'<a class="close" href="#">Close</a>' +
			'</header>' +
			'<article class="content">' +
				'<h2>'+opts.headline+'</h2>' + 
				'<div>' + opts.msg + '</div>' +
				'<div class="button-holder right">' +
					'<a class="close" href="#">Cancel</a>' +
					(opts.btn != false ? btn.parents().html()  : '' ) +
			'</article>' +
		'</div>'
	).on('click', '.usr-btn', function(e){
		var close = opts.btn.fn.call(e.delegateTarget);
		if( close !== false )
			$(e.delegateTarget).data('popup').close();
	});

	popup.appendTo('body').data('popup', new Popup(popup, {
		open: function(){
			$(this).css('marginLeft', - $(this).width()/2);
		},
		close: function(){
			$(this).data('popup').remove();
		}
	}));
	popup.data('popup').open();
}

Number.prototype.cardinal = function(){
   var s=["th","st","nd","rd"],
       v=this%100;
   return this+(s[(v-20)%10]||s[v]||s[0]);
};


Popup = function(el, opts){
	var self = this;
	this.$el = el;
	this.opts = opts == undefined ? {} : opts;
	this.$o = $('#overlay').clone().hide().insertBefore(this.$el);

	if(this.$el.hasClass('show-header'))
		this.$o.addClass('show-header');

	this.$el.on('click', '.close', function(){
		self.close();
		return false;
	});	

	this.$o.on('click.popup', function(){
		self.close();
	});
}
Popup.prototype.open = function(){
	this.$o.show();
	this.$el.show();

	// set the proper height
	this.$o.css('height', screen.availHeight);

	if($.isFunction(this.opts.open))
		this.opts.open.call(this.$el);
}
Popup.prototype.close = function(){
	this.$el.hide();
	this.$o.hide();
	if($.isFunction(this.opts.close))
		this.opts.close.call(this.$el);
}
Popup.prototype.toggle = function(){
	if(this.$el.is(':visible'))
		this.close();
	else
		this.open();
}
Popup.prototype.remove = function(){
	this.$el.remove();
	this.$o.remove();
}

if (typeof console == 'undefined' || typeof console.log == 'undefined' || typeof console.groupCollapsed == 'undefined') { 
	var temp = { 
		log : function (text) { return false; },
		groupCollapsed: function(){	console.log('groupStart'); console.log(arguments); },
		groupEnd: function(){ console.log('groupEnd'); }
	}

	console = $.extend({}, console, temp);
}