<?php require "_header.php"; ?>

<script type="text/template" id="tpl-city-list-item">
	<td class="cell-id"><%= id %></td>
	<td class="cell-name"><%= name %></td>
	<td class="cell-location"><i class="icon-map-marker cityLocation"></i></td>
	<td class="cell-routes"><%= routescount %></td>
	<td class="cell-actions"><i class="icon-remove removeCity" data-id="<%= id %>"></i></td>
</script>

<div class="container">
	<table id="cities" class="table table-condensed">
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>&nbsp;</th>
				<th>Routes</th>
				<th>&nbsp;</th>
			</tr>
		</thead>
	</table>
</div>

<?php require "_footer.php"; ?>