<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// figure out any overloads
if(isset($_COOKIE['season_id'])){
	header("X-Season-Id: ".$_COOKIE['season_id']);
	switch($_COOKIE['season_id']){
		case 6:
			$overload = 'pick-machines';
			break;
		default:
			$overload = 'default';
			break;
	}
} else {
	header("X-Season-Id: Not Set");
	$overload = 'pick-machines'; // set it to whatever the default season is
}



$cwd = dirname($_SERVER['PHP_SELF']);
$requested = str_replace($cwd, '', $_SERVER['REQUEST_URI']);

function outputContentType($requested){
	$ext = explode('.', $requested);
	$ext = array_pop($ext);

	switch ($ext) {
		case 'js':
			$type = 'text/javascript';
			break;
		
		case 'css':
			$type = 'text/css';
			break;

		case 'html':
			$type = 'text/html';
			break;

		default:
			$type = 'text/plain';
			break;
	}

	header("Content-type: ".$type);
}

if(file_exists($overload.$requested)){
	outputContentType($requested);
	include $overload.$requested;

} elseif(file_exists('default'.$requested)){
	outputContentType($requested);
	include 'default'.$requested;

} else {	
	header($_SERVER["SERVER_PROTOCOL"]." 404 Not Found", true, 404); 
}
?>