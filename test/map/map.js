(function() {
	gloader.map.add(
		"glow",
		{
			$version     : "1.0.0",
			"glow"       : "{$base}core.js",
			"glow.data"  : "{$base}data.js",
			"glow.ajax"  : "{$base}ajax.js"
		},
		{
			$version : "1.1.0"
		},
		{
			$version : "1.1.1-rc1"
		},
		{
			$version : "1.1.1"
		},
		{
			$version     : "1.2.0",
			"glow"       : "{$base}core.js",
			"glow.extra" : ["{$base}extra.js", "{$base}extra.css", "{$base}extra2.css"],
			"glow.ajax"  : null
		},
		{
			$version : "1.3.0",
			$debug   : "debug/"
		},
		{
			$version : "1.9.9",
			$debug   : ""
		},
		{
			$version : "2.0.0"
		}
	);
})();