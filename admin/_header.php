<!DOCTYPE html>
<html>
<head lang="en">
	<meta charset="utf-8">
	<title>eTranzport Admin</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="../js/libs/bootstrap/css/bootstrap.css" rel="stylesheet">
	<link href="css/admin.css" rel="stylesheet">
</head>
<body>

<div class="navbar navbar-fixed-top">
	<span class="navbar-brand">eTranzport Admin</span>

	<ul class="nav navbar-nav">
		<li class="active"><a href="index.php">Home</a></li>
		<!--li>
			<a href="#" class="disabled-link">Users</a>
		</li-->
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown">
				Content
				<b class="caret"></b>
			</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="index.php#cities">Cities</a></li>
				<!--li><a href="#cargo" class="disabled">Cargo</a></li-->
			</ul>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown">
				Server
				<b class="caret"></b>
			</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="sysinfo.php">Server Info</a></li>
			</ul>
		</li>
	</ul>

</div>
