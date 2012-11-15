<!DOCTYPE html>
<html>
<head lang="en">
	<meta charset="utf-8">
	<title>eTranzport Experiments</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="js/libs/bootstrap/css/bootstrap.css" rel="stylesheet">
	<link href="css/etranzport.css" rel="stylesheet">
	<link href="js/libs/bootstrap/css/bootstrap-responsive.css" rel="stylesheet">

	<link href="js/libs/leaflet/leaflet.css" rel="stylesheet">
</head>
<body>

<div class="navbar navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<span class="brand">eTranzport Experiments</span>
			<div class="input-prepend input-append pull-right">
				<span class="add-on">Time Factor</span><input type="text" class="span1" id="timeFactor"><button class="btn" type="button" id="timeFactorDec">&lt;</button><button class="btn" type="button" id="timeFactorInc">&gt;</button>
			</div>
		</div>
	</div>
</div>

<script type="text/template" id="tpl-vehicle-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-state"><span class="label <%= stateCss %>"><%= state %></span></td>
	<td class="cell-origin"><%= origin_name %></td>
	<td class="cell-dest"><%= destination_name %></td>
	<td class="cell-startts"><%= startts %></td>
	<td class="cell-distance"><%= distance %></td>
	<td class="cell-duration"><%= duration %></td>
	<td class="cell-traveled"><%= traveled %></td>
	<td class="cell-speed"><%= speed %></td>
	<td class="cell-actions"><i class="icon-remove removeVehicle" data-id="<%= id %>"></i></td>
</script>

<script type="text/template" id="tpl-route-search-found">
	<div id="routeFoundAlert" class="alert alert-block">
		<a class="close" data-dismiss="alert" href="#">&times;</a>
		<h4 class="alert-heading">Route found!</h4>
		<p>
			From <strong id="add-origin"><%= origin %></strong> to <strong id="add-destination"><%= destination %></strong>.<br>
			Distance: <strong id="add-distance"><%= distance %></strong>.
		</p>
		<p>
			<label for="setTruckSpeed">Truck Speed:</label>
			<div class="input-append">
				<input type="text" class="input-small" id="setVehicleSpeed" value="55"><span class="add-on">mph</span>
			</div>
		</p>
		<p>
			<button id="addRouteButton" class="btn btn-primary">Add Route</button>
		</p>
	</div>
</script>

<script type="text/template" id="tpl-route-search-error">
	<div id="routeErrorAlert" class="alert alert-error alert-block">
		<a class="close" data-dismiss="alert" href="#">&times;</a>
		<h4 class="alert-heading">Could not find any route</h4>
		<%= error %>
	</div>
</script>

<div class="container">
	<table id="routes" class="table table-condensed">
		<thead>
			<tr>
				<th>#</th>
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

	<form id="route-search" class="well form-inline">
		<div class="btn-group pull-left">
			<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
				<span id="origin-city-label" class="dropdown-label">Origin</span>
				<span class="caret"></span>
			</a>
			<ul class="dropdown-menu" id="origin-city">
			</ul>
		</div>

		<div class="btn-group pull-left">
			<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
				<span id="destination-city-label" class="dropdown-label">Destination</span>
				<span class="caret"></span>
			</a>
			<ul class="dropdown-menu" id="destination-city">
			</ul>
		</div>

		<div class="btn-group pull-left">
			<button id="findRouteButton" class="btn btn-primary">Find Route</button>
		</div>

		<div class="btn-group pull-left">
			<span id="findRouteProgress" class="muted">Trying to figure out a route...</span>
		</div>
	</form>

	<div id="alert"></div>

	<div id="map"></div>
</div>

<script src="js/libs/jquery/jquery.js"></script>
<script src="js/libs/underscore/underscore.js"></script>
<script src="js/libs/backbone/backbone.js"></script>
<script src="js/libs/bootstrap/js/bootstrap.js"></script>
<script src="js/libs/leaflet/leaflet.js"></script>
<script src="js/utils.js"></script>
<script src="js/etranzport.js"></script>

</body>
</html>