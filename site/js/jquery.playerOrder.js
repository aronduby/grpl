(function($){

	$.fn.playerOrder = function( options ){
		if(this.data('po_inst'))
			return this.data('po_inst');


		function PlayerOrder(el, options){
			if(el.nodeType) 
				el = $(el);

			this.options = options;

			// Functions used for as event handlers need usable `this` and must not change to be removable
			this.onBeforeSwipe = this.onBeforeSwipe.bind(this);
			this.onBeforeReorder = this.onBeforeReorder.bind(this);
			this.onReorder = this.onReorder.bind(this);
			this.onToggleDNP = this.onToggleDNP.bind(this);

			this.attach(el);
		}

		PlayerOrder.prototype = {
			el: null,
			options: {},
			slip: null,

			attach: function(el){
				this.el = el;

				this.el.on('click touchstart', 'button.dnp', this.onToggleDNP)
				.on({
					'slip:beforeswipe': this.onBeforeSwipe,
					'slip:beforereorder': this.onBeforeReorder,
					'slip:reorder': this.onReorder
				});

				this.slip = new Slip(this.el[0]);
			},

			detach: function(){
				// make sure toggle dnp has touchstart since mobile browsers dont simulate click on button
				this.el.off('click touchstart', 'button.dnp', this.onToggleDNP)
				.off({
					'slip:beforeswipe': this.onBeforeSwipe,
					'slip:beforereorder': this.onBeforeReorder,
					'slip:reorder': this.onBeforeReorder
				});

				this.slip.detach();
			},

			onBeforeSwipe: function(e){
				e.preventDefault();
			},
			onBeforeReorder: function(e){
				if($(e.target).hasClass('disabled') || $(e.target).is('button'))
					e.preventDefault();
			},
			onReorder: function(e){
				e.target.parentNode.insertBefore(e.target, e.originalEvent.detail.insertBefore);
				this.checkForErrors();				
				return false;
			},

			onToggleDNP: function(e){
				
				$(e.target).parent().toggleClass('dnp');
				this.checkForErrors();
				return false;
			},

			getGroup: function(li){
				if(li.nodeType)
					li = $(li);

				var group = li.nextUntil('.divider');
				group = group.add(li.prevUntil('.divider')).add(li);

				return group;
			},

			checkForErrors: function(){
				$('li.error', this.el).removeClass('error');

				var self = this,
					checks = $('> li:first-child, > li.divider + li', this.el);

				checks.each(function(){
					var group = self.getGroup(this),
						not_dnps = group.not('.dnp');

					if(not_dnps.length < 3 || not_dnps.length > 4){
						group.addClass('error');
					}
				});

				if( $('li.error', this.el).length > 0 )
					return true;
				else
					return false;
			},

			save: function(){
				if(this.checkForErrors()){
					// alert('You have groups with too few or too many people. Fix them before continuing, they\'re highlighted in red.');
					return false;
				}

				var players = [],
					grouping = 0,
					order = 0;

				$('li', this.el).each(function(){
					if($(this).hasClass('divider')){
						grouping++;
						return true; // continue;
					}

					players.push($.extend({}, $(this).data(), {
						start_order: order,
						grouping: grouping,
						dnp: $(this).hasClass('dnp')	
					}));
					order++;
				});

				return players;
			}
		}

		return this.each(function(){
			$(this).data('po_inst', new PlayerOrder(this));
		});
	}

})(jQuery);