(function() {
	var foreign = {
		hello: "world",
		v: "1.2.0",
		module: function(m) {
			m.builder(this);
		}
	};

	if (window.gloader) {
		gloader.library({
			name: "foreign",
			version: "1.2.0",
			builder: function () {
				return foreign;
			}
		});
	}
	else {
		window.foreign = foreign;
	}
	
	(window.gloader || foreign).module({
		name: "foreign.extra",
		library: ["foreign", "1.2.0"],
		depends: [],
		builder: function(foreign) {
			foreign.extra = {
				hola: "mundo",
				v: "1.2.0"
			}
			return foreign.extra;
		}
	});

})();

		
