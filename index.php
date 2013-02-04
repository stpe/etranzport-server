<!DOCTYPE html>
<html>
<head lang="en">
	<meta charset="utf-8">
	<title>eTranzport Experiments</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="js/libs/bootstrap/css/bootstrap.css" rel="stylesheet">
	<link href="css/etranzport.css" rel="stylesheet">
	<link href="js/libs/bootstrap/css/bootstrap-responsive.css" rel="stylesheet">
	<link href="js/libs/select2/select2.css" rel="stylesheet">
	<link href="js/libs/leaflet/leaflet.css" rel="stylesheet">
</head>
<body>

<div class="navbar navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<span class="brand">eTranzport Experiments</span>
			<div class="navbar-control input-prepend input-append pull-right">
				<span class="add-on">Time Factor</span><input type="text" class="span1 disabled" id="timeFactor" disabled>
			</div>
		</div>
	</div>
</div>

<script type="text/template" id="tpl-trip-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-vehicle"><%= vehicle_name %></td>
	<td class="cell-state"><span class="label <%= stateCss %>"><%= state %></span></td>
	<td class="cell-origin"><%= origin_name %></td>
	<td class="cell-dest"><%= destination_name %></td>
	<td class="cell-startts"><%= startts %></td>
	<td class="cell-distance"><%= distance %></td>
	<td class="cell-duration"><%= duration %></td>
	<td class="cell-traveled"><%= traveled %></td>
	<td class="cell-speed"><%= speed %></td>
	<td class="cell-actions"><i class="icon-remove removeTrip" data-id="<%= id %>"></i></td>
</script>

<script type="text/template" id="tpl-vehicle-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-vehicle-class"><%= vclass == "0" ? "Truck" : "Trailer" %></td>
	<td class="cell-vehicle"><%= name %></td>
	<td class="cell-vehicle-type"><span class="badge badge-inverse"><%= type %></span></td>
	<td class="cell-state"><span class="label <%= stateCss %>"><%= stateTitle %></span></td>
	<td class="cell-city"><span class="<%= parseInt(state) != 0 ? 'vehicle-enroute' : '' %>"><%= city_name %></span></td>
	<td class="cell-actions"><i class="icon-remove removeVehicle" data-id="<%= id %>"></i></td>
</script>

<script type="text/template" id="tpl-truck-add">
	<div id="vehicleAdd">
		<p>
			<label for="vehicle-name">Name:</label>
			<div class="input-append">
				<input type="text" class="input-small" id="vehicle-name" name="vehicle-name">
			</div>
		</p>
		<p>
			<label for="vehicle-type">Truck Type:</label>
			<input type="hidden" class="input-large" id="vehicle-type">
		</p>
		<p>
			<label for="vehicle-city">Start City:</label>
			<input type="text" class="input-large" id="vehicle-city" name="vehicle-city">
		</p>
	</div>
</script>

<script type="text/template" id="tpl-trailer-add">
	<div id="trailerAdd">
		<p>
			<label for="vehicleTrailers">Trailer:</label>
			<div>
				<input type="hidden" id="vehicle-trailers" class="input-large">
			</div>
		</p>	
		<p>
			<label for="vehicle-city">Start City:</label>
			<input type="text" class="input-large" id="vehicle-city" name="vehicle-city">
		</p>
	</div>
</script>


<script type="text/template" id="tpl-route-search-found">
	<div id="routeFoundAlert">
		<p>
			From <strong id="add-origin"><%= origin %></strong> to <strong id="add-destination"><%= destination %></strong>.<br>
			Distance: <strong id="add-distance"><%= distance %></strong>.
		</p>
		<div class="btn-group">
			<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
				<span id="select-vehicle-label" class="dropdown-label">Vehicle</span>
				<span class="caret"></span>
			</a>
			<ul class="dropdown-menu change-on-select" id="selectVehicle">
			</ul>
		</div>
		<p>
			<label for="setTruckSpeed">Truck Speed:</label>
			<div class="input-append">
				<input type="text" class="input-small" id="setVehicleSpeed" value="55"><span class="add-on">mph</span>
			</div>
		</p>
	</div>
</script>

<div class="container">
	<h3>Vehicles</h3>
	
	<form id="vehicle-form" class="well form-inline">

		<table id="vehicles" class="table table-condensed">
			<thead>
				<tr>
					<th>#</th>
					<th>Class</th>
					<th>Name</th>
					<th>Type</th>
					<th>State</th>
					<th>Current City</th>
				</tr>
			</thead>
		</table>

		<div class="btn-group pull-left">
			<button id="addTruck" class="btn btn-primary">Add Truck</button>
			<button id="addTrailer" class="btn btn-primary">Add Trailer</button>
		</div>
		<div class="clear"></div>
	</form>

	<h3>Trips</h3>
	<form id="route-search" class="well form-inline">

		<table id="trips" class="table table-condensed">
			<thead>
				<tr>
					<th>#</th>
					<th>Vehicle</th>
					<th>State</th>
					<th>Origin</th>
					<th>Destination</th>
					<th>Start</th>
					<th>Distance</th>
					<th>Duration</th>
					<th>Traveled</th>
					<th>Speed</th>
				</tr>
			</thead>
		</table>

		<div class="btn-group pull-left">
			<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
				<span id="origin-city-label" class="dropdown-label">Origin</span>
				<span class="caret"></span>
			</a>
			<ul class="dropdown-menu change-on-select" id="origin-city">
			</ul>
		</div>

		<div class="btn-group pull-left">
			<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
				<span id="destination-city-label" class="dropdown-label">Destination</span>
				<span class="caret"></span>
			</a>
			<ul class="dropdown-menu change-on-select" id="destination-city">
			</ul>
		</div>

		<div class="btn-group pull-left">
			<button id="findRouteButton" class="btn btn-primary">Do Haul</button>
		</div>

		<div class="btn-group pull-left">
			<span id="findRouteProgress" class="muted">Trying to figure out a route...</span>
		</div>

		<div class="clear"></div>
	</form>

	<div id="alert"></div>

	<div id="map"></div>
</div>

<script src="js/libs/jquery/jquery.js"></script>
<script src="js/libs/underscore/underscore.js"></script>
<script src="js/libs/backbone/backbone.js"></script>
<script src="js/libs/bootstrap/js/bootstrap.js"></script>
<script src="js/libs/backbone/addons/backbone.bootstrap-modal.js"></script>
<script src="js/libs/backbone/addons/backbone-eventbroker.js"></script>
<script src="js/libs/select2/select2.js"></script>
<script src="js/libs/leaflet/leaflet.js"></script>
<script src="js/utils.js"></script>
<script src="js/etranzport.js"></script>

</body>
</html>