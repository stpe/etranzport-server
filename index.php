<!DOCTYPE html>
<html>
<head lang="en">
	<meta charset="utf-8">
	<title>eTranzport</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="js/libs/bootstrap/css/bootstrap.css" rel="stylesheet">
	<link href="css/etranzport.css" rel="stylesheet">
	<link href="js/libs/select2/select2.css" rel="stylesheet">
	<link href="js/libs/leaflet/leaflet.css" rel="stylesheet">

	<?php if ($_SERVER['SERVER_ADDR'] != '127.0.0.1') { ?>
	<script>
	var _prum = [['id', '51e1bd6aabe53d4111000000'],
	             ['mark', 'firstbyte', (new Date()).getTime()]];
	(function() {
	    var s = document.getElementsByTagName('script')[0]
	      , p = document.createElement('script');
	    p.async = 'async';
	    p.src = '//rum-static.pingdom.net/prum.min.js';
	    s.parentNode.insertBefore(p, s);
	})();
	</script>
	<?php } ?>
</head>
<body>

<nav class="navbar navbar-default navbar-fixed-top">
	<span class="navbar-brand">eTranzport</span>
	<!-- Previous place for timeFactor input -->
</nav>

<script type="text/template" id="tpl-trip-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-vehicle"><%= vehicle_name %></td>
	<td class="cell-cargo"><%= cargo %></td>
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
	<td class="cell-haul">
		<% if (vclass == 0 && state == 0) { %>
			<button class="btn btn-xs btn-primary doHaul" type="button">Do Haul</button>
		<% } %>
	</td>
	<td class="cell-actions"><i class="icon-remove removeVehicle" data-id="<%= id %>"></i></td>
</script>

<script type="text/template" id="tpl-truck-add">
	<div id="vehicleAdd" class="form-horizontal">
		<div class="form-group">
			<label class="col-lg-4 control-label" for="vehicle-name">Name</label>
			<div class="col-lg-8">
				<input type="text" class="input-small" id="vehicle-name" name="vehicle-name">
			</div>
		</div>
		<div class="form-group">
			<label class="col-lg-4 control-label" for="vehicle-type">Truck Type</label>
			<div class="col-lg-8">
				<input type="hidden" id="vehicle-type" style="width: 100%">
			</div>
		</div>
		<div class="form-group">
			<label class="col-lg-4 control-label" for="vehicle-city">Start City</label>
			<div class="col-lg-8">
				<input type="hidden" id="vehicle-city" name="vehicle-city" style="width: 100%">
			</div>
		</div>
	</div>
</script>

<script type="text/template" id="tpl-trailer-add">
	<div id="trailerAdd" class="form-horizontal">
		<div class="form-group">
			<label class="col-lg-4 control-label" for="vehicle-trailers">Trailer</label>
			<div class="col-lg-8">
				<input type="hidden" id="vehicle-trailers" style="width: 100%">
			</div>
		</div>
		<div class="form-group">
			<label class="col-lg-4 control-label" for="vehicle-city">Start City</label>
			<div class="col-lg-8">
				<input type="hidden" id="vehicle-city" name="vehicle-city" style="width: 100%">
			</div>
		</div>
	</div>
</script>

<script type="text/template" id="tpl-dohaul">
	<div id="doHaulAlert" class="form-horizontal">
		<div class="form-group">
			<label class="col-lg-4 control-label">Current Location</label>
			<div class="col-lg-8">
				<input class="form-control" type="text" placeholder="<%= origin %>" disabled>
			</div>
		</div>

		<div class="form-group">
			<label class="col-lg-4 control-label">Vehicle</label>
			<div class="col-lg-8">
				<input class="form-control" type="text" placeholder="<%= name %>" disabled>
			</div>
		</div>

		<div class="form-group">
			<label class="col-lg-4 control-label" for="haul-destination-city">Destination</label>
			<div class="col-lg-8">
				<input type="hidden" id="haul-destination-city" name="haul-destination-city" style="width: 100%">
			</div>
		</div>

		<div class="form-group">
			<label class="col-lg-4 control-label" for="setVehicleSpeed">Speed</label>
			<div class="col-lg-8 input-group">
				<input type="text" class="form-control" id="setVehicleSpeed" value="55">
				<span class="input-group-addon">mph</span>
			</div>
		</div>

		<div class="form-group">
			<label class="col-lg-4 control-label" for="haul-trailer">Trailers</label>
			<div class="col-lg-8">
				<input type="hidden" id="haul-trailer" name="haul-trailer" style="width: 100%">
			</div>
		</div>

		<div class="form-group">
			<label class="col-lg-4 control-label" for="haul-cargo">Cargo</label>
			<div class="col-lg-8">
				<input type="hidden" id="haul-cargo" name="haul-cargo" style="width: 100%">
			</div>
		</div>

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
					<th>Cargo</th>
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
<script src="js/libs/backbone/marionette/backbone.marionette.js"></script>
<script src="js/libs/select2/select2.js"></script>
<script src="js/libs/leaflet/leaflet.js"></script>
<script src="js/utils.js"></script>
<script src="js/etranzport.js"></script>

</body>
</html>