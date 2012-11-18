<?php require "_header.php"; ?>

<div class="container">
	<div>
		<style type="text/css">
		/* Modified ugly style from phpinfo() */
		a:link {color: #000099; text-decoration: none; background-color: #ffffff;}
		a:hover {text-decoration: underline;}
		table {border-collapse: collapse;}
		.center {text-align: center;}
		.center table { margin-left: auto; margin-right: auto; text-align: left;}
		.center th { text-align: center !important; }
		td { vertical-align: baseline;}
		.p {text-align: left;}
		.e {font-weight: bold; color: #000000;}
		.h {font-weight: bold; color: #000000;}
		.v {color: #000000;}
		.vr {text-align: right; color: #000000;}
		img { display: none}
		</style>

		<?php
			// buffer output to get phpinfo into a string
			ob_start();
			phpinfo();
			$info = ob_get_contents();
			ob_get_clean();

			// strip ugly style
			$info = preg_replace( '%^.*<body>(.*)</body>.*$%ms','$1',$info);
			echo $info;
		?>
	</div>
</div>

<?php require "_footer.php"; ?>