gloader.module({
	name: 'glow.widgets',
	library: ['glow', '1.0.0'],
	
	builder: function(glow) {
		glow.widgets = {};
	}
});

gloader.module({
	name: 'glow.widgets.Panel',
	library: ['glow', '1.0.0'],
	depends: [
		['glow', '1.0.0', 'glow.widgets']
	],
	
	builder: function(glow) {
		glow.widgets.Panel = function() {
		};
	}
});