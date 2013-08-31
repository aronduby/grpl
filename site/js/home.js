$(document).ready(function(){
	
	$('.page[data-route="home"]').on("init", function() {
		$.cookie('skiphome','1',{
			expires: 120
		})
	});

});