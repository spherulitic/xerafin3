<?php
	session_start();
	if (!isset($_SESSION["USER_ID"])){
?>
<?php
	}
	else {
?>
		<div id="mainLayer">
				<div id="mainNav" class="container-fluid">
				</div>
				<div id="contentMain" class="container-fluid">
				<div class="row">
					<div class="col-xs-12 col-sm-7 col-md-8">
						<div class="row">
							<div id='leftArea' class="col-xs-12 col-sm-12 col-md-6"></div>
							<div id='middleArea' class="col-xs-12 col-sm-12 col-md-6"></div>
						</div>
					</div>
					<div id='rightArea' class="col-xs-12 col-sm-5 col-md-4">
					</div>
				</div>
			</div>
		</div>
<?php }
session_commit();
?>
