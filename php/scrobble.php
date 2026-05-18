<?php
//Open the file
$dataFile = "../files/listeners.json";

$post_rec = file_get_contents("php://input") or die("Error: Cannot get file input post");

$json_file = file_get_contents($dataFile) or die("Error: Cannot get listeners file");

$json_array = json_decode($json_file);

$json_rec = json_decode($post_rec);

foreach ($json_array as $listener) {
    if ($listener->id == $json_rec->id) {
        // Found the listener, add the scrobble
        $new_scrobble = array(
            "track_id" => $json_rec->track_id,
            "date" => $json_rec->date
        );
        array_unshift($listener->scrobbles, $new_scrobble);
    }
}

$out_str = json_encode($json_array, JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);

$bytes = file_put_contents($dataFile, $out_str);

if ($bytes > 0) {
    echo "Successful scrobble";
} else {
    echo "Scrobble failed";
}
