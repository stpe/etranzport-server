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

require_once('../admin/api/google.php');

require_once '../libs/Idiorm/idiorm.php';

if ($_SERVER['HTTP_HOST'] == 'etranzport.local') {
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

function ormAsArray($orm) {
    function rowAsArray($row) {
        return $row->as_array();
    }

    return array_map('rowAsArray', $orm);
}

function populateRecord($record, $fields) {
    foreach($fields as $field => $value) {
        $record->set($field, $value);
    }
}

/**
 * Routes
 */

$app->get('/trips', function() {
    global $app;

    $trips =
        ORM::for_table('trips')
            ->select('trips.*')
            ->select('origin_city.name', 'origin_name')
            ->select('destination_city.name', 'destination_name')
            ->join('cities', array('origin_city.id', '=', 'trips.origin'), 'origin_city')
            ->join('cities', array('destination_city.id', '=', 'trips.destination'), 'destination_city')
            ->find_many();

    ResponseOk(ormAsArray($trips));
});

$app->post('/trips', function() {
    global $app;

    $env = $app->environment();

    $data = json_decode($env['slim.input'], true);

    $trip = ORM::for_table('trips')->create();

    $trip->state = $data['state'];
    $trip->origin = $data['origin'];
    $trip->destination = $data['destination'];
    $trip->distance = $data['distance'];
    $trip->duration = $data['duration'];
    $trip->speed = $data['speed'];
    $trip->startts = time();

    $trip->save();

//echo ORM::get_last_query();
    ResponseOk($trip->as_array());
});

$app->delete('/trips/:id', function($id) {
    $trip = ORM::for_table('trips')->find_one($id);
    $trip->delete();
});

$app->get('/cities', function() {
    $cities = ORM::for_table('cities')->find_many();

    ResponseOk(ormAsArray($cities));
});

$app->post('/cities', function() {
    global $app;

    $city = ORM::for_table('cities')->create();

    $fields = json_decode($app->request()->getBody());
    populateRecord($city, $fields);

    $city->save();

    ResponseOk($city->as_array());
});

$app->delete('/cities/:id', function($id) {
    // delete city
    $city = ORM::for_table('cities')
        ->where('id', $id)
        ->find_one();

    $city->delete();

    // delete all routes to/from city
    $routes = ORM::for_table('routes')
        ->where_raw('(`destination` = ? OR `origin` = ?)', array($id, $id))
        ->delete_many();
});

$app->put('/cities/:id', function($id) {
    global $app;

    $city = ORM::for_table('cities')
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
        ORM::for_table('routes')
            ->select('routes.*')
            ->select('origin_city.name', 'origin_name')
            ->select('destination_city.name', 'destination_name')
            ->join('cities', array('origin_city.id', '=', 'routes.origin'), 'origin_city')
            ->join('cities', array('destination_city.id', '=', 'routes.destination'), 'destination_city')
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
    $cities = ORM::for_table('cities')
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

    $route = ORM::for_table('routes')->create();

    $route->origin = $origin;
    $route->destination = $destination;
    $route->distance = $polyline['distance'];
    $route->polyline = $polyline['polyline'];

    $route->save();
})->conditions(array('origin' => '\d+', 'destination' => '\d+'));

$app->delete('/routes/:origin/:destination', function($origin, $destination) {
    $reverse = false;
    if ($destination < $origin) {
        $reverse = true;
        list($origin, $destination) = array($destination, $origin);
    } 

    $route = 
        ORM::for_table('routes')
            ->where('origin', $origin)
            ->where('destination', $destination)
            ->find_one();

    $route->delete();
});

$app->get('/routes/:id', function($id) {
    $routes =
        ORM::for_table('routes')
            ->raw_query('SELECT routes.id, :id AS origin, cities.id AS destination, cities.name AS destination_name, routes.distance, routes.polyline FROM routes LEFT JOIN cities ON cities.id=IF(origin = :id, destination, origin) WHERE routes.origin = :id OR routes.destination = :id', array(':id' => $id))
            ->find_many();

    ResponseOk(ormAsArray($routes));
});

// list of cities where there is no route to from given city
$app->get('/routes/nonexisting/:id', function($id) {
    $routes =
        ORM::for_table('cities')
            ->raw_query('SELECT id, name FROM cities WHERE id != :id AND id NOT IN (SELECT IF(origin = :id, destination, origin) AS id FROM routes WHERE origin = :id OR destination = :id)', array(':id' => $id))
            ->find_many();

    ResponseOk(ormAsArray($routes));
});

/**
 * Step 4: Run the Slim application
 *
 * This method should be called last. This is responsible for executing
 * the Slim application using the settings and routes defined above.
 */
$app->run();
