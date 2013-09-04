<?php require "_header.php"; ?>


<script type="text/template" id="tpl-route-list-item">
	<td class="cell-destination" data-route-id="<%= destination %>"><%= destination_name %></td>
	<td class="cell-distance"><%= distance %></td>
	<td class="cell-actions right-align">
		<button class="btn btn-xs map">Map</button>
		<button class="btn btn-xs btn-danger remove" data-id="<%= destination %>">Remove</button>
	</td>
</script>

<script type="text/template" id="tpl-non-existing-route-list-item">
	<td class="cell-destination" data-route-id="<%= id %>"><%= name %></td>
	<td class="cell-distance"></td>
	<td class="cell-actions right-align">
		<!--button class="btn btn-xs map">Map</button-->
		<button class="btn btn-xs btn-info add" data-id="<%= id %>">Add</button>
	</td>
</script>

<script type="text/template" id="tpl-routes-listview">
	<table id="routes" class="table table-condensed">
		<tbody>
		</tbody>
	</table>
</script>

<script type="text/template" id="tpl-route-edit">
	<div id="editroutes" class="form-horizontal">
		<h4>Existing Routes</h4>
		<div id="routeslist">
		</div>

		<h4>Add New Routes</h4>
		<div id="nonexistingrouteslist">
		</div>
	</div>
</script>

<script type="text/template" id="tpl-map-view">
	<div class="google-map-canvas" id="map"></div>
</script>

<script type="text/template" id="tpl-city-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-name"><%= name %></td>
	<td class="cell-location"><i class="icon-map-marker cityLocation"></i></td>
	<!--td class="cell-routes"><%= routescount %></td-->
	<td class="cell-actions">
		<button class="btn btn-xs edit">Edit</button>
		<button class="btn btn-xs routes">Routes</button>
		<button class="btn btn-xs btn-danger remove" data-id="<%= id %>">Remove</button>
	</td>
</script>

<script type="text/template" id="tpl-cities-listview">
	<h1>Cities</h1>

	<table id="cities" class="table table-condensed">
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>&nbsp;</th>
				<!--th>Routes</th-->
				<th>&nbsp;</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
	</table>

	<button class="btn btn-primary newcity">New City</button>
</script>

<script type="text/template" id="tpl-city-edit">
	<div class="form-horizontal">
		<div class="form-group">
		  <label class="control-label" for="name">Name</label>
		  <div class="controls">
		    <input type="text" id="city-name" class="input-xlarge" name="name" value="<%= name %>">
		  </div>
		</div>
		<div class="form-group" id="citymap">
		</div>
		<div class="form-group">
		  <label class="control-label" for="location">Location</label>
		  <div class="controls">
		    <input type="text" class="input-small" name="location" id="location" value="<%= location %>">
		    <span class="help-inline">In <a href="https://developers.google.com/maps/documentation/utilities/polylineutility" target="_blank">encoded polyline</a> format</span>
		  </div>
		</div>
		<div class="form-group">
		  <label class="control-label" for="country">Country</label>
		  <div class="controls">
		    <input type="text" class="input-small" name="country" id="country" value="<%= country %>">
		  </div>
		</div>
	</div>
</script>

<div class="container" id="main">

</div>

<?php require "_footer.php"; ?>