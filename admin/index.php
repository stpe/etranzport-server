<?php require "_header.php"; ?>


<script type="text/template" id="tpl-route-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-destination"><%= name %></td>
	<td class="cell-distance"><%= distance %></td>
	<td class="cell-actions right-align">
		<button class="btn btn-mini map">Map</button>
		<button class="btn btn-mini btn-danger remove" data-id="<%= id %>">Remove</button>
	</td>
</script>

<script type="text/template" id="tpl-non-existing-route-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-destination"><%= name %></td>
	<td class="cell-distance"><%= distance %></td>
	<td class="cell-actions right-align">
		<button class="btn btn-mini map">Map</button>
		<button class="btn btn-mini btn-info add" data-id="<%= id %>">Add</button>
	</td>
</script>

<script type="text/template" id="tpl-routes-listview">
	<table id="routes" class="table table-condensed">
		<tbody>
		</tbody>
	</table>
</script>

<script type="text/template" id="tpl-route-edit">
	<form class="form-horizontal modal" id="editroutes">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Edit Routes</h3>
		</div>
		<div class="modal-body">
			<h4>Existing Routes</h4>
			<div id="routeslist">
			</div>

			<h4>Add New Routes</h4>
			<div id="nonexistingrouteslist">
			</div>
		</div>
		<div class="modal-footer">
			<a href="#" class="btn" data-dismiss="modal">Close</a>
		</div>
	</form>
</script>

<script type="text/template" id="tpl-city-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-name"><%= name %></td>
	<td class="cell-location"><i class="icon-map-marker cityLocation"></i></td>
	<!--td class="cell-routes"><%= routescount %></td-->
	<td class="cell-actions">
		<button class="btn btn-mini edit">Edit</button>
		<button class="btn btn-mini routes">Routes</button>
		<button class="btn btn-mini btn-danger remove" data-id="<%= id %>">Remove</button>
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
	<form class="form-horizontal modal" id="editcity">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Edit City</h3>
		</div>
		<fieldset class="modal-body">
			<div class="control-group">
			  <label class="control-label" for="name">Name</label>
			  <div class="controls">
			    <input type="text" class="input-xlarge" name="name" value="<%= name %>">
			    <p class="help-block">Supporting help text</p>
			  </div>
			</div>
			<div class="control-group">
			  <label class="control-label" for="name">Location</label>
			  <div class="controls">
			    <input type="text" class="input-xlarge" id="location" value="<%= location %>">
			    <p class="help-block">In <a href="https://developers.google.com/maps/documentation/utilities/polylineutility" target="_blank">encoded polyline</a> format</p>
			  </div>
			</div>
		</fieldset>
		<div class="modal-footer">
			<a href="#" class="btn" data-dismiss="modal">Close</a>
			<a href="#" class="btn btn-primary save">Save changes</a>
		</div>
	</form>
</script>

<div class="container" id="main">

</div>

<?php require "_footer.php"; ?>