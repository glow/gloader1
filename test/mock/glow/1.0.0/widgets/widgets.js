gloader.module({
	name: 'glow.widgets',
	library: ['glow', '1.0.0'],
	
	builder: function(glow) {
		glow.widgets = {};
	}
});

gloader.module({
	name: 'glow.widgets.Mask',
	library: ['glow', '1.0.0'],
	depends: [
		['glow', '1.0.0', 'glow.widgets']
	],
	
	builder: function(glow) {
		glow.widgets.Mask = function() {
		};
	}
});

function createModule() {
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
}

// simulate a slow network connection?
if (window.withDelay) { setTimeout(createModule, 1000); }
else createModule();