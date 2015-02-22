/*
 *	Basically an extension to the link format
 *	add {} at the end and populate with space seperated class name
 *	[a button](http://www.google.com){btn btn-primary}
*/
define(function(require){
	
	var Showdown = require('showdown');

	var classedlinks = function(converter){
		return [
			{ 
				type: 'lang', 
				regex: '\\[([\\w ]+)\\]\\(([:\\?\\=#\\/\\w\\.]+)\\){([\\w -]+)}', 
				replace: function(match, title, url , classes){
					return '<a href="'+url+'" class="'+classes+'">'+title+'</a>';
				}
			}
		];
	}
	Showdown.extensions.classedlinks = classedlinks;

});