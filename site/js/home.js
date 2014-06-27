$(document).ready(function(){
	
	$('.page[data-route="home"]').on("init", function() {
		var page = this;

		$.cookie('skiphome','1',{
			expires: 120
		});

		return Api.get('machine.active', {
			success: function(machines){
				$('.machine-count', page).text(machines.length);

				var list = [];
				$.each(machines, function(){
					list.push( this.name );
				});
				list.sort();
				$('.machine-list', page).text( list.join('; ') );
			}
		})
	});

});