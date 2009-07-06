(function() {
	var glow ={
		isFake: true
	};

	if (window.gloader) {
		gloader.library({
			name: "glow",
			version: "1.5.0",
			builder: function () {
				return glow;
			}
		});
	}
	else {
		window.glow = glow;
	}
	
	(window.gloader || glow).module({
		name: "glow.data",
		library: ["glow", "1.5.0"],
		depends: [],
		builder: function(glow) {
			glow.data = {
				isFake: true
			}
			return glow.data;
		}
	});

})();

		
