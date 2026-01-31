<?php
	define ("READ_USER", "xerfRead");
	define ("READ_PASS", "R34dN0H4x!");
	define ("READ_NAME", "xerafin");

	# Xera Encrypt
	define ("CRY_METHOD", "aes-256-cbc");
	define ("CRY_KEY", "05ee0f41c670f42e9e93639985033b9f5791b0c0093547dd28c3195d0b498c14");

	# FB
	define ("FB_APP_SECRET", "4b3f34d2af8559806e548feb5f383625");
	define ("FB_APP_ID", "1685551981765809");
	define ("FB_APP_VERSION", "v4.0");

	# Error HANDLING
	define ("ERROR_STAT",array('Unknown','Examined','Debugging','In Next Update','Resolved'));
	define ("ERROR_DIR","errorLogs");

	# TOKEN SETTINGS - THIS MAY MOVE TO INDIVIDUAL CONFIGS
	define ("MAX_TOKEN_LIFE", 604800); // 1 Week, determines the maximum lifespan of the cookie client side without relogging.
	define ("MAX_REFRESH_TIME", 7200); // 2 hours, used to refresh the amount of time the cookie is active for on the server
	define ("INACTIVE_MAX_TIME", 1800); // 30 minutes, used to make all other cookies for that user have a shorter lifespan
?>
