<!DOCTYPE html>
<html>
<head lang="en">
	<meta charset="utf-8">
	<title>eTranzport Admin</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<link href="../js/libs/bootstrap/css/bootstrap.css" rel="stylesheet">
	<link href="css/admin.css" rel="stylesheet">
	<link href="../js/libs/bootstrap/css/bootstrap-responsive.css" rel="stylesheet">
</head>
<body>

<div class="navbar navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">

			<!-- .btn-navbar is used as the toggle for collapsed navbar content -->
			<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</a>

			<span class="brand">eTranzport Admin</span>

			<!-- Everything you want hidden at 940px or less, place within here -->
			<div class="nav-collapse">
				<ul class="nav">
					<li class="active">
						<a href="index.php">Home</a>
					</li>
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
		</div>
	</div>
</div>
