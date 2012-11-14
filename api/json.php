<?php

require_once('../decodePolylineToArray.php');

require_once '../libs/Idiorm/idiorm.php';
ORM::configure('mysql:host=etranz-158379.mysql.binero.se;dbname=158379-etranz');
ORM::configure('username', '158379_dkcq056');
ORM::configure('password', 'Z67KCjga43');
ORM::configure('driver_options', array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));

ORM::configure('logging', true); // only for debugging; echo ORM::get_last_query();

function getDetailedPolyline($data) {
	$steps = $data['routes'][0]['legs']['0']['steps'];
	$points = array();
	for ($i = 0; $i < count($steps); $i++) {
		$points = array_merge($points, decodePolylineToArray($steps[$i]['polyline']['points']));
	}

	return array(
		'points' => $points,
		'origin' => $data['routes'][0]['legs'][0]['start_address'],
		'destination' => $data['routes'][0]['legs'][0]['end_address'],
		'distance' => $data['routes'][0]['legs'][0]['distance']['value'],
		'duration' => $data['routes'][0]['legs'][0]['duration']['text']
	);
}

function getOverviewPolyline($data) {
	$points = decodePolylineToArray($data['routes'][0]['overview_polyline']['points']);

	return array(
		'points' => $points,
		'origin' => $data['routes'][0]['legs'][0]['start_address'],
		'destination' => $data['routes'][0]['legs'][0]['end_address'],
		'distance' => $data['routes'][0]['legs'][0]['distance']['value'],
		'duration' => $data['routes'][0]['legs'][0]['duration']['value']
	);
}

function raw($data) {
	$points = decodePolylineToArray($data['routes'][0]['overview_polyline']['points']);

	$polyline = $data['routes'][0]['overview_polyline']['points'];
/*
    $route = ORM::for_table('routes')
        ->where('origin', 1)
        ->where('destination', 2)
        ->find_one();

    $route->set('polyline', $polyline);
    $route->save();
*/
	return array(
		'origin' => $data['routes'][0]['legs'][0]['start_address'],
		'destination' => $data['routes'][0]['legs'][0]['end_address'],
		'polyline' => $polyline,
		'points' => $points,
		'distance' => $data['routes'][0]['legs'][0]['distance']['value']
	);
}

/* ------ */

function send_response($data) {
	header("Content-Type: application/json; charset=utf-8");
	echo json_encode($data);
}

/* ------ */

switch($_GET['type']) {
	case 'directions':
		$origin = $_GET['origin'];
		$destination = $_GET['destination'];
		$detailed = $_GET['detailed'] == 'true';

		$url = 'http://maps.googleapis.com/maps/api/directions/json?origin=' . urlencode($origin) . '&destination=' . urlencode($destination) . '&units=metric&sensor=false';

		// fetch
		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_HEADER, 0);	
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		$json = curl_exec($ch);
		curl_close($ch);

		$data = json_decode($json, true);

		// break if error
		if ($data['status'] != 'OK') {
			send_response(array('error' => $data['status']));
			return;
		}

		send_response( raw($data) );
		// send_response($detailed ? getDetailedPolyline($data) : getOverviewPolyline($data));
		break;
	default:
		send_response(array('error' => 'Unknown type'));
		break;
}