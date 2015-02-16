<?php

$data_string = $_POST['payload'];
$data = json_decode($data_string);

// save to the changelog
$dbh = PDODB::getInstance();
$sql = "INSERT INTO changelog SET 
	commit_id=:id,
	author_name=:author_name,
	author_email=:author_email,
	url=:url,
	msg=:message,
	committed=:timestamp";

$stmt = $dbh->prepare($sql);
foreach($data->commits as $commit){
	$commit->author_name = $commit->author->name;
	$commit->author_email = $commit->author->email;
	unset($commit->author);
	$stmt->execute((array)$commit);
}

// post to bugify
$ch = curl_init('http://bugify.aronduby.com/commits/post/e81a4337cbd23476e95596b9034d0761dbb3d9b6');
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                                                                     
curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$rsp = curl_exec($ch);

echo "Changelog:\tGood\nBugify:\t".$rsp;

?>