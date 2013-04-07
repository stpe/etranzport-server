<?php
/**
 * Step 1: Require the Slim PHP 5 Framework
 *
 * If using the default file layout, the `Slim/` directory
 * will already be on your include path. If you move the `Slim/`
 * directory elsewhere, ensure that it is added to your include path
 * or update this file path as needed.
 */
require '../libs/Slim/Slim.php';
\Slim\Slim::registerAutoloader();

require_once('constants.php');
require_once('data.php');

require_once('middleware/CustomErrorMiddleware.php');

require_once('../admin/api/google.php');
require_once '../libs/Idiorm/idiorm.php';

if ($_SERVER['SERVER_ADDR'] == '127.0.0.1') {
    ORM::configure('mysql:host=localhost;dbname=etranzport');
    ORM::configure('username', 'root');
} else {
    ORM::configure('mysql:host=etranz-158379.mysql.binero.se;dbname=158379-etranz');
    ORM::configure('username', '158379_dkcq056');
    ORM::configure('password', 'Z67KCjga43');    
}

ORM::configure('driver_options', array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));

ORM::configure('logging', true); // only for debugging; echo ORM::get_last_query();

/**
 * Step 2: Instantiate the Slim application
 *
 * Here we instantiate the Slim application with its default settings.
 * However, we could also pass a key-value array of settings.
 * Refer to the online documentation for available settings.
 */
$app = new \Slim\Slim();

$app->add(new CustomErrorMiddleware());

$app->config(array(
    'log.enabled' => true,
    'log.level' => 4,
    'debug' => true
));

$log = $app->getLog();

$log->info("Instantiate...");
$log->error("Slim test error");
$log->debug("Slim test debug");

/**
 * Step 3: Define the Slim application routes
 *
 * Here we define several Slim application routes that respond
 * to appropriate HTTP request methods. In this example, the second
 * argument for `Slim::get`, `Slim::post`, `Slim::put`, and `Slim::delete`
 * is an anonymous function. If you are using PHP < 5.3, the
 * second argument should be any variable that returns `true` for
 * `is_callable()`. An example GET route for PHP < 5.3 is:
 *
 * $app = new Slim();
 * $app->get('/hello/:name', 'myFunction');
 * function myFunction($name) { echo "Hello, $name"; }
 */

function ResponseOk($data = null) {
    global $app;

    $response = $app->response();
    $response['Content-Type'] = 'application/json; charset=utf-8';
    $response['X-Powered-By'] = 'Slim';

    if ($data !== null) {
        echo json_encode($data);
    }
}

function ResponseFail($data = null) {
    global $app;

    $response = $app->response();
    $response['Content-Type'] = 'application/json';
    $response['X-Powered-By'] = 'Slim';

    if ($data !== null) {
        echo json_encode($data);
    }

    $app->response()->status(400);    
}

function ResponseNotFound($data = null) {
    global $app;

    $response = $app->response();
    $response['Content-Type'] = 'application/json';
    $response['X-Powered-By'] = 'Slim';

    if ($data !== null) {
        echo json_encode($data);
    }

    $app->response()->status(404);    
}

function populateRecord($record, $fields) {
    foreach($fields as $field => $value) {
        $record->set($field, $value);
    }
}

/**
 * Routes
 */

// Data

// Get json data by supplying filename (except .json ending)
$app->get('/data/:file', function($file) {
    // strip non alpha characters to avoid haxxors
    $file = preg_replace('/[^a-z0-9_]/', '', $file);

    try {
        $data = new Data("../data/". $file .".json");
        ResponseOk($data->getData());
    } catch(DataException $e) {
        ResponseNotFound("Data file '$file' not found.");
    }
});


// Trips

// get currently completed distance for trip based on lapsed time since start
function getTripCurrentDistance($trip) {
    $lapsed = time() - $trip->startts;
    return $lapsed * $trip->speed * $trip->timefactor;
}

$app->get('/trips', function() {
    global $app;

    $trips =
        ORM::for_table('trip')
            ->select('trip.*')
            ->select('origin_city.name', 'origin_name')
            ->select('destination_city.name', 'destination_name')
            ->select('vehicle.name', 'vehicle_name')
            ->join('city', array('origin_city.id', '=', 'trip.origin'), 'origin_city')
            ->join('city', array('destination_city.id', '=', 'trip.destination'), 'destination_city')
            ->join('vehicle', array('vehicle.id', '=', 'trip.vehicle'), 'vehicle')
            ->order_by_asc('trip.id')
            ->find_many();

    $now = time();

    foreach($trips as $trip) {
        $distance_completed = getTripCurrentDistance($trip);

        // trip still not yet finished
        if ($distance_completed < $trip->distance) {
            $trip->state = TripState::ENROUTE;
            $trip->distance_completed = $distance_completed;
        } else {
            // trip finished, but state is en route
            if ($trip->state == TripState::ENROUTE) {
                endTrip($trip, TripState::COMPLETED);
            }
        }
    }

    // convert to array
    $result = array_map(function($trip) {
        return $trip->as_array();
    }, $trips);

    ResponseOk($result);
});

$app->post('/trips', function() {
    global $app;

    $env = $app->environment();
    $data = json_decode($env['slim.input'], true);

    $trip = ORM::for_table('trip')->create();

    $trip->state = $data['state'];
    $trip->origin = $data['origin'];
    $trip->destination = $data['destination'];
    $trip->distance = $data['distance'];
    $trip->duration = $data['duration'];
    $trip->timefactor = $data['timefactor'];
    $trip->speed = $data['speed'];
    $trip->startts = time();
    $trip->vehicle = $data['vehicle'];
    $trip->attr = $data['attr'];

    $trip->save();

    $result = $trip->as_array();

    // get vehicle name
    $vehicle = ORM::for_table('vehicle')->find_one($trip->vehicle);
    $result['vehicle_name'] = $vehicle->name;

    // update vehicle state
    $vehicle->city = $trip->destination;
    $vehicle->state = TruckState::DRIVING;
    $vehicle->save();

    // connect trailer(s) to vehicle
    $attr = json_decode($data['attr'], true);
    if ($attr['trailers']) {
        $trailers_str = implode(",", $attr['trailers']);

        ORM::raw_execute(
            'UPDATE vehicle SET connected = ?, city = ?, state = ? WHERE id IN ('. $trailers_str .')', array($data['vehicle'], $data['destination'], TruckState::DRIVING)
        );
    }

    ResponseOk($result);
});

$app->delete('/trips/:id', function($id) {
    $trip = ORM::for_table('trip')->find_one($id);
    $trip->delete();
});

$app->map('/trips/:id', function($id) {
    global $app;

    $env = $app->environment();
    $data = json_decode($env['slim.input'], true);

    $trip = ORM::for_table('trip')->find_one($id);

    $result = endTrip($trip, $data['state']);

    ResponseOk($result);
})->via('PATCH');


function endTrip($trip, $state) {
    global $log;

    // perform anti cheat check here
    $distance_completed = getTripCurrentDistance($trip);
    if ($distance_completed < $trip->distance) {
        $log->error("Trying to end non-completed trip. Cheating? " . json_encode($trip->as_array()));
    }

    $trip->state = $state;
    $trip->save();

    // update vehicle
    $vehicle = ORM::for_table('vehicle')->find_one($trip->vehicle);
    $vehicle->state = TruckState::OFFDUTY;
    $vehicle->save();

    // disconnect trailers connected to vehicle
    ORM::raw_execute(
        'UPDATE vehicle SET connected = NULL, state = ? WHERE connected = ?', array(TruckState::OFFDUTY, $vehicle->id)
    );

    return $trip->as_array();
}

// Vehicles

$app->get('/vehicles(/:vclass)', function($vclass = VehicleClass::BOTH) {
    global $app;

    $vehicles = ORM::for_table('vehicle')
        ->select('vehicle.*')
        ->select('city.name', 'city_name')
        ->join('city', array('city.id', '=', 'vehicle.city'));

    if ($vclass != VehicleClass::BOTH) {
        $vehicles->where('vclass', $vclass);
    }

    ResponseOk($vehicles->find_array());
});

$app->post('/vehicles', function() {
    global $app;

    $env = $app->environment();
    $data = json_decode($env['slim.input'], true);

    $vehicle = ORM::for_table('vehicle')->create();

    $vehicle->name = $data['name'];
    $vehicle->state = $data['state'];
    $vehicle->type = $data['type'];
    $vehicle->vclass = $data['vclass'];
    $vehicle->city = $data['city'];

    $vehicle->save();

    $result = $vehicle->as_array();

    // get vehicle name
    $city = ORM::for_table('city')->find_one($vehicle->city);
    $result['city_name'] = $city->name;

    ResponseOk($result);
});

$app->delete('/vehicles/:id', function($id) {
    // delete vehicle
    $vehicle = ORM::for_table('vehicle')
        ->where('id', $id)
        ->find_one();

    $vehicle->delete();
});

// Cities

$app->get('/cities', function() {
    $cities = ORM::for_table('city')->find_array();

    ResponseOk($cities);
});

$app->post('/cities', function() {
    global $app;

    $city = ORM::for_table('city')->create();

    $fields = json_decode($app->request()->getBody());
    populateRecord($city, $fields);

    $city->save();

    ResponseOk($city->as_array());
});

$app->delete('/cities/:id', function($id) {
    // delete city
    $city = ORM::for_table('city')
        ->where('id', $id)
        ->find_one();

    $city->delete();

    // delete all routes to/from city
    $routes = ORM::for_table('route')
        ->where_raw('(`destination` = ? OR `origin` = ?)', array($id, $id))
        ->delete_many();
});

$app->put('/cities/:id', function($id) {
    global $app;

    $city = ORM::for_table('city')
        ->where('id', $id)
        ->find_one();

    if (!$city) {
        ResponseNotFound($id);
        return;
    }

    $fields = json_decode($app->request()->getBody());
    populateRecord($city, $fields);

    $city->save();
});

$app->get('/routes/:origin/:destination', function($origin, $destination) {
    $reverse = false;
    if ($destination < $origin) {
        $reverse = true;
        list($origin, $destination) = array($destination, $origin);
    } 

    $route = 
        ORM::for_table('route')
            ->select('route.*')
            ->select('origin_city.name', 'origin_name')
            ->select('destination_city.name', 'destination_name')
            ->join('city', array('origin_city.id', '=', 'route.origin'), 'origin_city')
            ->join('city', array('destination_city.id', '=', 'route.destination'), 'destination_city')
            ->where('origin', $origin)
            ->where('destination', $destination)
            ->find_one();

    if (!$route) {
        ResponseNotFound("Cannot find route from ". $origin ." to ". $destination);
        return;
    }

    $response = $route->as_array();

    // decode and (if necessary) reverse order of polyline points
    // note: this should be moved to front-end
    $points = DirectionsAPI::decodePolylineToArray($route->polyline);
    if ($reverse) {
        $points = array_reverse($points);

        // if reversed, switch origin/destination
        $response["origin"] = $route->destination;
        $response["origin_name"] = $route->destination_name;
        $response["destination"] = $route->origin;
        $response["destination_name"] = $route->origin_name;
    }
    $response['points'] = $points;

    ResponseOk($response);
})->conditions(array('origin' => '\d+', 'destination' => '\d+'));

$app->post('/routes/:origin/:destination', function($origin, $destination) {
    $reverse = false;
    if ($destination < $origin) {
        $reverse = true;
        list($origin, $destination) = array($destination, $origin);
    } 

    // fetch from db
    $cities = ORM::for_table('city')
        ->where_raw('(`id` = ? OR `id` = ?)', array($origin, $destination))
        ->order_by_asc('id')
        ->find_array();

    if (count($cities) != 2) {
        ResponseNotFound($origin .", ". $destination);
        return;
    }

    $origin_str = $cities[0]["name"];
    $destination_str = $cities[1]["name"];

    $dir = new DirectionsAPI();
    $polyline = $dir->getOverviewPolyline($origin_str, $destination_str);

    if (!empty($polyline["error"])) {
        ResponseNotFound("Could not generate route.");
        return;
    }

    $route = ORM::for_table('route')->create();

    $route->origin = $origin;
    $route->destination = $destination;
    $route->distance = $polyline['distance'];
    $route->polyline = $polyline['polyline'];

    $route->save();

    // return results
    $result = $route->as_array();
    $result['destination_name'] = $destination_str;

    ResponseOk($result);    
})->conditions(array('origin' => '\d+', 'destination' => '\d+'));

$app->delete('/routes/:origin/:destination', function($origin, $destination) {
    $reverse = false;
    if ($destination < $origin) {
        $reverse = true;
        list($origin, $destination) = array($destination, $origin);
    } 

    $route = 
        ORM::for_table('route')
            ->where('origin', $origin)
            ->where('destination', $destination)
            ->find_one();

    $route->delete();
});

$app->get('/routes/:id(/:verbosity)', function($id, $verbosity = "full") {
    global $app;

    $select = 'SELECT route.id, :id AS origin, city.id AS destination, city.name AS destination_name, route.distance ';

    // unless verbosity is something else than "full", include polyline in resposne
    if ($verbosity == "full") {
        $select .= ', route.polyline ';
    }

    $routes =
        ORM::for_table('route')
            ->raw_query(
                $select.
                'FROM route '.
                'JOIN city '.
                    'ON city.id=IF(origin = :id, destination, origin) '.
                    'WHERE route.origin = :id OR route.destination = :id', array(':id' => $id)
                )
            ->find_array();

    ResponseOk($routes);
})->conditions(array('id' => '\d+'));

// list of cities where there is no route to from given city
$app->get('/routes/nonexisting/:id', function($id) {
    $routes =
        ORM::for_table('city')
            ->raw_query('SELECT id, name FROM city WHERE id != :id AND id NOT IN (SELECT IF(origin = :id, destination, origin) AS id FROM route WHERE origin = :id OR destination = :id)', array(':id' => $id))
            ->find_array();

    ResponseOk($routes);
})->conditions(array('id' => '\d+'));

/**
 * Step 4: Run the Slim application
 *
 * This method should be called last. This is responsible for executing
 * the Slim application using the settings and routes defined above.
 */
$app->run();
