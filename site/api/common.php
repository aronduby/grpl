<?php
# DONT FORGET TO REMOVE ME
// ini_set('display_errors', '1');

// database
DEFINE('DB_TYPE', 'mysql');
DEFINE('DB_SERVER', 'localhost');
DEFINE('DB_USER', 'grpl');
DEFINE('DB_PASSWD', 'phyle7mothy');
DEFINE('DB_NAME', 'grpl');


DEFINE('DEV_EMAIL', 'aron.duby@gmail.com');

// session_start();


function exception_error_handler($errno, $errstr, $errfile, $errline ) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
}

function uncaughtExceptionHandler($exception){
	
	/*
	$handlers = ob_list_handlers();
	while(!empty($handlers)){
		ob_end_clean();
		$handlers = ob_list_handlers();
	}
	*/
	
    $msg = "Uncaught Exception Handler:  Uncaught exception '%s' with message '%s' in %s:%s\nStack trace:\n%s\n  thrown in %s on line %s"; 
    $msg = sprintf(
        $msg,
        get_class($exception),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
        $exception->getTraceAsString(),
        $exception->getFile(),
        $exception->getLine()
    );

	// output an error page
	print '<pre>'.$msg.'</pre>';
}

function defaultAutoLoad($class_name){
	//check current folder
	if(file_exists($class_name.'.php')) {
		require_once($class_name.'.php');

	//check for a classes folder
	} elseif(file_exists('classes/'.$class_name.'.php')){
		require_once('classes/'.$class_name.'.php');

	//check one folder up
	} elseif(file_exists('../'.$class_name.'.php')) {
		require_once('../'.$class_name.'.php');

	//check one folder up for a classes folder
	} elseif(file_exists('../classes/'.$class_name.'.php')){
		require_once('../classes/'.$class_name.'.php');

	} else {
		//check the php include folders
		$include_path = get_include_path();
		$include_path_tokens = explode(':', $include_path);
		foreach($include_path_tokens as $prefix){
			$path = $prefix . '/' . $class_name . '.php';
			if(file_exists($path)){
				require_once $path;
			}
		}
	}
}
set_error_handler('exception_error_handler');
set_exception_handler('uncaughtExceptionHandler');
spl_autoload_register('defaultAutoLoad');



$season = Season::create(2);
$player = Player::create('AronDuby');


/*
takes a digit less than or equal to ten and returns ordinal
used for subnav in menu, put here for other stuff which might need it
*/
function makeOrdinalWord($number){
	if($number>10)
		return false;

	switch($number){
		case 1:
			return "first";
		case 2:
			return "second";
		case 3:
			return "third";
		case 4:
			return "fourth";
		case 5:
			return "fifth";
		case 6:
			return "sixth";
		case 7:
			return "seventh";
		case 8:
			return "eighth";
		case 9:
			return "ninth";
		case 10:
			return "tenth";
	}
}


function is_odd($number) {
	return $number & 1; // 0 = even, 1 = odd
}
function isCurrent($p,$v){
if($p == $v){return ' current';}
}

function print_p($value, $exit = false) {

	echo '<div style="border: 2px dotted red; background-color: #fbffd6; display: block; padding: 4px; text-align:left;">';
		$backtrace = debug_backtrace();
		echo '<b>File: </b> '.$backtrace[0]['file'].'<br>';
		echo '<b>Line: </b>'.$backtrace[0]['line'].'<br>';
		
		if(is_array($value) || is_object($value)){
			echo '<pre>'.print_r($value, true).'</pre>';
		} elseif(is_string($value)){
			var_dump($value);
		} else {
			echo '<pre>';
			var_dump($value);
			echo '</pre>';
		}
	echo '</div>';

	if ($exit === true)
		die();
}



// 'www.google.com' becomes '<a href="http://www.google.com">www.google.com</a>'
function autolink($text) {
	$text = preg_replace('/(?<!\S)([\w.]+)(@)([\w.]+)\b/i', ''. returnJSemail('$1@$3') .'', $text);	
	$text = preg_replace('/(?<!\S)((http(s?):\/\/)|(www\.))+([\w.\/&=#?\-~%;]+)\b/i', '<a href="http$3://$4$5">http$3://$4$5</a>', $text);
	return ($text);
}


// 'blah blah blah blah blah blah blah' becomes 'blah blah...'
function excerptAndHighlight($text, $word=NULL, $radius=50, $highlight_begin='<strong>', $highlight_end='</strong>') {
	if (!$word) {
		if(strlen($text)>$radius*2)
			return restoreTags(substr($text, 0, strpos($text,' ',$radius*2))."...");
		else
			return $text;
	} else {
		$word = trim($word);
		$word_pos = stripos($text, $word);
		if ($word_pos !== false) {
			if ($word_pos-$radius <= 0)
				$begin_pos = 0;
			else 
				$begin_pos = strpos($text,' ',max(0,$word_pos-$radius))+1;
			$after_pos = strpos($text,' ',min(strlen($text), $word_pos+strlen($word)+$radius))
				or $after_pos = strlen($text);

			if ($begin_pos>0) $excerpt .= '...';
			$excerpt .= substr($text, $begin_pos, $word_pos-$begin_pos);
			$excerpt .= $highlight_begin.substr($text, $word_pos, strlen($word)).$highlight_end;
			$excerpt .= substr($text, $word_pos+strlen($word), $after_pos-($word_pos+strlen($word)));
			if ($after_pos<strlen($text)) $excerpt .= '...';

			return restoreTags($excerpt);
		} else {
			return $text;
		}
	}
}

//===================================================================================//
// Original PHP code by Chirp Internet: www.chirp.com.au // Please acknowledge use of this code by including this header.

// Used in newsDisplay function - restores unmatched html tags that were truncated
function restoreTags($input) {

// addition 7-20 AD
// if input doesn't start with a p tag, add it
if(strpos($input, '<p>')!== 0)
	$input = '<p>'.$input;

 $opened = $closed = array(); // tally opened and closed tags in order

	if(preg_match_all("/<(\/?[a-z]+)>/i", $input, $matches)) {
		 foreach($matches[1] as $tag) {
			if(preg_match("/^[a-z]+$/i", $tag, $regs)) {
				 $opened[] = $regs[0];
			} elseif(preg_match("/^\/([a-z]+)$/i", $tag, $regs)) {
				 $closed[] = $regs[1];
			}
		 }
	}
	// use closing tags to cancel out opened tags
	if($closed) {
		foreach($opened as $idx => $tag) {
		 foreach($closed as $idx2 => $tag2) {
			if($tag2 == $tag) {
				unset($opened[$idx]);
				 unset($closed[$idx2]);
				 break;
			 }
			}
		}
	}
	// close tags that are still open
	if($opened) {
		$tagstoclose = array_reverse($opened);
		 foreach($tagstoclose as $tag)
			$input .= "</$tag>";
	}
	return $input;
}
?>