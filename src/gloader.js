/**
	A module loader for Glow.
 */
(function(){
	if (window.gloader) return;
	
	window.gloader = {

		_requests: [], // {gloader.Request}
		_modules:  {}, // modId: {gloader.Module|undefined}
		_expects:  {}, // modId: {Number} - module definitions that are expected but were not requested
		_extras:   {}, // modId: {Object} - module definitions provided but not yet requested
		_errors:   [], // {String} - used for testing purposes

		util: {
			/** Determine if a filepath could be the name of this file. */
			getGloaderFile: function(filepath) { // the gloader file can have a few name variations, but will always start with "gloader" and end with ".js" (excluding possible querystring)
				if (filepath && /(^|^.*[\/\\])(gloader(\.[^\/\\]+)?\.js)(\?|$)/i.test(filepath)) {
					var dir = RegExp.$1;
//// as a temporary fix to the problem of the gloader upgrade, remove any "cached/" from the dir
					if (dir) dir = dir.replace("cached/", "");

					return {
						dir: dir,
						name: RegExp.$2
					};
				}
				return undefined; // the filepath is not possibly this file
			}
		},

		/** Locations of all known module files. */
		map: {

			/** Locations of known javascript files. */
			js: {}, // modId: URL

			/** Locations of known stylesheet files. */
			css: {}, // modId: URL

			/** Interpolate values in the given library definition. */
			parse: function(libraryName, libraryVersions) { /*debug*///console.log("gloader.map.parse("+libraryName+", "+libraryVersions+")");
				// create an empty library object to be returned at the end
				var lib = {name: libraryName, versions: []};

				// keep track of the properties set in previous version definitions
				// like: {$someName: "someValue"}
				var scope = {};

				// required scope properties
				// order controls order of interpolation
				// e.g. a $base can contain a {$version}, but not visa versa
				// $name means the library's name
				var scopeProps = ["$name", "$version", "$base"];
				scopeProps.has = function(what) { // just a quick convenience method
					for (var i = 0; i < this.length; i++) {
						if (what == this[i]) return true;
					}
					return false;
				}
	
				// include user defined properties
				if (gloader.mapProps && gloader.mapProps[lib.name]) {
					for (var p in gloader.mapProps[lib.name]) {
						if (!scopeProps.has(p)) { // scopeProps items will be unique
							scopeProps.push(p);
						}
					}
				}
				
				// initialize the scope object
				for (var p = 0; p < scopeProps.length; p++) {
					scope[scopeProps[p]] = undefined;
				}
				scope.$name = lib.name;
			
				// set user-defined properties in scope
				if (gloader.mapProps && gloader.mapProps[lib.name]) {
					for (var p in gloader.mapProps[lib.name]) {
						scope[p] = gloader.mapProps[lib.name][p];
					}
				}

				// loop over each version definition
				for (var i = 0; i < libraryVersions.length; i++) {
					var version = libraryVersions[i];

					// add to or delete from the scope any version properties,
					for (var v in version) {
						// a value of type null means: "delete" from scope
						if (version[v] === null) {
							delete version[v];
							delete scope[v];
						}
						// a non-null value means: "add" (or overwrite) to scope
						else {
							if (v.indexOf("$") === 0) scope[v] = version[v]; // $values must be strings
							else if (typeof version[v] == "string") {
								version[v] = [version[v]]; // other values must be arrays
								scope[v] = version[v].slice(0); // copy
							}
							else if (typeof version[v].push != "undefined") { // already an array?
								scope[v] = version[v].slice(0); // copy;
							}
							else throw new Error("invalid type: "+typeof version[v]);
						}
					}

					// fill in any undefined version properties that were defined before
					for (var s in scope) {
						if (typeof version[s] == "undefined") {
							if (s.indexOf("$") === 0) version[s] = scope[s];
							else version[s] = scope[s].slice(0); // copy
						}
					}

					// interpolate all {$var} strings in all version properties with $prop values
 					for (var p = 0; p < scopeProps.length; p++) {
 						var prop = scopeProps[p];
 						
						for (var vp = 0; vp < p; vp++) {
							var vprop = scopeProps[vp];
							if (typeof version[vprop] == "undefined") version[prop] = scope[prop]; // this version does not redefine this property
 							var patt = new RegExp('\\{\\'+vprop+'\\}', "g");
 						
							version[prop] = version[prop].replace(patt, version[vprop]);
						}
 					}

					// interpolate all {$var} strings in all version items with $prop values
  					for (vi in version) {
  						if (vi.indexOf("$") === 0 ) continue; // these have already been interped

  						for (var vii = 0; vii < version[vi].length; vii++) {
  							for (var p = 0; p < scopeProps.length; p++) {
 								var prop = scopeProps[p];							
 								var patt = new RegExp('\\{\\'+prop+'\\}', "g");
 								version[vi][vii] = ""+version[vi][vii].replace(patt, ""+version[prop]);
 							}
 						}
					}

					lib.versions.push(version);
	
				}

				return lib;
			},

			/**
				Populate this map with some library data.
				@param {String} libraryName The name of the library you are adding.
				@param {Object} ... One or more objects that define the files in
				the various versions of this library.
			*/
			add: function() { /*debug*///console.log("gloader.map.add("+arguments+")");
				// note trick to convert arguments into an array (less the first item)
				var args = [];
				for (var i = 1; i < arguments.length; i++) {
					args.push(arguments[i]);
				}

				var lib = gloader.map.parse(arguments[0], args);
				
				// populate the js and css tables with the interpolated key/values: modId => src
				for (var i = 0; i < lib.versions.length; i++) {
					var version = lib.versions[i];
					for (var p in version) {
						if (p.charAt(0) == "$") continue; // for gloader use only

						// modId like: libraryName/versionId/moduleName
						var modId = version.$name+"/"+version.$version+"/"+p;

						// note: can overwrite
						gloader.map.js[modId]  = version[p][0];
						gloader.map.css[modId] = version[p][1];
					}
				}
			},

			/** A map from elsewhere is included in this one. This must be synchronous. */
			include: function(src) { /*debug*///console.log("gloader.map.include("+src+")");
				if (gloader.map._include[src]) { // is already included so can skip doing so again
					return false
				}
				else {
					document.write('<script type="text/javascript" src="'+src+'"></script>\n');
					gloader.map._include[src] = true;
					return true;
				}
			},
			_include: {}, // memoize

			/** Get the value of the latest minor version number of a library. */
			latest: function(libName, v) { /*debug*///console.log("gloader.map.latest("+libName+", "+v+")");
				if (gloader.map.$latest[libName+"/"+v]) {
					return gloader.map.$latest[libName+"/"+v];
				}
				var result = v;

				var parts = v.split(".");

				// if the version is not fully specified
				if (parts.length < 3) {

					// if the version is in the format maj<int>[.min<int>]
					if (
						parts[0] == parseInt(parts[0])
						&&
						(typeof parts[1] == "undefined" || parts[1] == parseInt(parts[1]))
					) {

						var invalid = new RegExp("[a-zA-Z\-]"), 
							latest = [parts[0], null, null], 
							mod;
						
						for (mod in gloader.map.js) {						
							var modParts = mod.split("/");
							if (modParts[0] == libName && modParts[2] == libName && !invalid.test(modParts[1])) {
								var modVParts = modParts[1].split(".");	
								if (modVParts[0] == parts[0]) { // same major
									if (
										(
											typeof parts[1] == "undefined" // no particular minor version was requested
											&&                             // and either...
											(
												latest[1] <= modVParts[1]      // the current latest minor version is not more recent as this module
												||                             // or
												(
													latest[1] == modVParts[1]  // and the current latest minor version matches this module's minor version
													&&
													latest[2] <= modVParts[2]  // and the latest bug version is not more recent as this module's bug version
												)
											)
										)
										||                                 // or
										(
											typeof parts[1] != "undefined" // a particular minor version was requested
											&&
											parts[1] == modVParts[1]       // and the requested minor version matches this module's minor version
											&&
											latest[2] <= modVParts[2]      // and the latest bug version is not more recent as this module's bug version
										)
									) {
										latest[1] = modVParts[1];
										latest[2] = modVParts[2];
									}
								}
							}
						}
						if (latest[2] != null) result = latest.join(".");
					}
				}

				gloader.map.$latest[libName+"/"+v] = result;
				return result;
			},
			$latest: {} // memoize
		},

		/** Give values to states that gloader can refer to. */
		settings: {

			ns: "bbc.glow.gloader",

			get: function(name) { /*debug*///console.log("get("+name+")");
				var n = " "+gloader.settings.ns+"."+name+"="
				var cookies = document.cookie.split(";");
				for (var i = 0; i < cookies.length; i++) {
					if ((" "+cookies[i]).indexOf(n) > -1) {
						return unescape(cookies[i].split("=")[1]);
					}
				}
			},

			set: function(name, value, path) { /*debug*///console.log("set("+name+", "+value+")");
				var n = gloader.settings.ns+"."+name;
				document.cookie = n + "=" + escape(value) + "; path="+((path)? path : "/")+";";
			},

			clear: function(name, path) { /*debug*///console.log("clear("+name+")");
				var d = new Date();
				d.setTime(d.getTime() - 1);
				var n = gloader.settings.ns+"."+name;
				document.cookie = n + "=; path="+((path)? path : "/")+"; expires=Thu, 01-Jan-70 00:00:01 GMT;";
			}
		},
		
		// javascript:(function(){gloader.loadOverride()})();
		loadOverride: function(version) {
			var current = gloader.settings.get("override");
			
			version = version || prompt("Enter version", current ? current : "");
			
			if (version === "") gloader.settings.clear("override");
			else if (version !== null) gloader.settings.set("override", version);
			
			location.reload();
		},
		
		// javascript:(function(){gloader.loadDebug()})();
		loadDebug: function() {
			gloader.settings.set("debug", "1");
			location.reload();
		},

		// javascript:(function(){gloader.unloadDebug()})();
		unloadDebug: function() {
			gloader.settings.clear("debug");
			location.reload();
		},
		
		expect: function(srcFile) { /*debug*///console.log("expecting modules in "+srcFile);
			srcFile = ""+srcFile;
			var modsInFile = [];
			var modId;
			for (modId in gloader.map.js) {
				if (gloader.map.js[modId] == srcFile) {
					modsInFile.push(modId);
					gloader._expects[modId] = (gloader._expects[modId] || 0)+1;
				}
			}
		},

		/** The user makes a request. */
		load: function() { /*debug*///console.log("gloader.load(...)");
			var r = {};
			if (typeof arguments[arguments.length-1].length == "undefined") {
				r = arguments[arguments.length-1];
				arguments.length--;
			}
			
			var newRequest = new gloader.Request(r);
			gloader._requests.push(newRequest);

			var mods = [];
			var override = gloader.settings.get("override");
			
			for (var i = 0; i < arguments.length; i++) {
				if (override && arguments[i][0]  == "glow") {
					// warn the user what we've done
					if (typeof console != "undefined" && console.log) console.log("Overriding version '"+arguments[i][1]+"' of glow to version '"+override+"'");
					arguments[i][1] = override;
				}
				mods.push(arguments[i]);
			}
			
			var ids = gloader.toIds(mods);
			
			newRequest.args = [];
			for (var i = 0; i < ids.length; i++) {
				newRequest.include(ids[i]);
				if (ids[i].match(/\/[^.]+$/)) {
					newRequest.args.push(ids[i]);
				}
			}

			// if all the requested modules are already loaded we can short-circuit
			var waitCount = newRequest.waits.length;
			for (var i = 0; i < newRequest.waits.length; i++) {
				if (
					gloader._modules[newRequest.waits[i]]
					&& gloader._modules[newRequest.waits[i]].status == gloader.Module.IMPLEMENTED
				) waitCount--;
			}

			if (waitCount > 0) {
				newRequest.status = gloader.Request.WAITING;
				gloader.request(ids, newRequest.async);

				gloader.resolve();
			}
			else {
				/*debug*///console.info("skipping the download");
				newRequest.complete();
			}
			// ====> opera 9.2 always exits here, it evalualtes *all* code inline.
		},

		/** We need some module files to complete a request. */
		request: function(mIds, async) { /*debug*///console.log("gloader.request(["+mIds.join(",")+"], "+async+")");
			for (var i = 0; i < mIds.length; i++) {
				if (gloader._extras[mIds[i]]) { // module was provided before it was requested
					gloader._modules[mIds[i]] = new gloader.Module(mIds[i]);
					var extra = gloader._extras[mIds[i]];
					delete gloader._extras[mIds[i]];
					gloader.provide(extra);
				}
				else if (!gloader._modules[mIds[i]]) {
					gloader._modules[mIds[i]] = new gloader.Module(mIds[i]);
					gloader._modules[mIds[i]].status = gloader.Module.REQUESTED;
				}
			}

			for (var m in gloader._modules) {
				if (gloader._modules[m].status < gloader.Module.IMPLEMENTED || gloader._modules[m].css) {
					gloader._modules[m].css = null;

					// the module was already fetched (asynchronously) and hasn't
					// yet arrived, but now is requested again synchronously,
					// in this case we must force the fetch to happen twice
					var force = (!async && gloader._modules[m].async == true && gloader._modules[m].status >= gloader.Module.FETCHED);
					gloader.fetch(gloader._modules[m], async, force);
				}
			}
		},

		/** Inject a module file into this web page. */
		fetch: function(m, async, force) { /*debug*///console.log("gloader.fetch("+m.id+", "+async+")");
			gloader._modules[m.id].async = async;
			var cssSrc = gloader.map.css[m.id];
			
			if (cssSrc && (force || !gloader._fetched[cssSrc])) { /*debug*///console.log("injecting css file: "+cssSrc);
				gloader._fetched[cssSrc] = 1;

				if (document) {
					var headElement;
					if (headElement = document.getElementsByTagName('head')[0]) {
						var link;
						if (link = document.createElement('link')) {
							link.href = cssSrc;
							link.rel = 'stylesheet';
							link.type = 'text/css';
							link.className = 'gloaded';
							headElement.appendChild(link);
						}
					}
					else	{
						document.write('<link rel="stylesheet" type="text\/css" href="'+cssSrc+'">');
					}
				}
			}

			if (!force && gloader._modules[m.id].status >= gloader.Module.FETCHED) return false;
			gloader._modules[m.id].status = gloader.Module.FETCHED;
			
			var jsSrc = gloader.map.js[m.id];
			
			if (!jsSrc) {
				var msg = "The gloader map is missing a JavaScript filepath for the module: "+m.id;
				var maps = [];
				for (var included_map in gloader.map._include) maps.push(included_map);
				msg += ".\rMaps included are: "+maps.join(", ")+".";
				gloader._errors.push(msg);
				throw new Error(msg);
			}
			
			if (force || (jsSrc && !gloader._fetched[jsSrc])) { /*debug*///console.log("fetching js file: "+jsSrc);
				gloader._fetched[jsSrc] = 1;
				
				// given the source file, we should expect all the modules in that source file
				gloader.expect(jsSrc);

				if (async) { /*debug*///console.log("inject: "+jsSrc);
					var headElement = document.getElementsByTagName('head')[0];
					var scriptElement = document.createElement('script');
					scriptElement.type = 'text/javascript';
					scriptElement.src = jsSrc;
					headElement.appendChild(scriptElement);
				}
				else { /*debug*///console.log("write: "+jsSrc);
					document.write('<script type="text/javascript" class="gloaded" src="'+jsSrc+'"></script>\n');
				}
			}
		},
		_fetched: {
		},

		/** A module file has arrived (been provided).
			@param {object} m The module definition from the remote source file.
		 */
		provide: function(m) { /*debug*///console.log("gloader.provide("+m.library[0]+"/"+m.library[1]+"/"+m.name+")");
			m.id = m.library[0]+"/"+m.library[1]+"/"+m.name; // modifying the module definition from the remote file

			if (!gloader._modules[m.id]) { // we got more modules than we requested
				gloader._extras[m.id] = m;
				return;
			}

			gloader._modules[m.id].status = gloader.Module.PROVIDED;

			gloader._modules[m.id].builder = m.builder;
			gloader._modules[m.id].builder.args = [];

			var d = gloader._modules[m.id].depends = (m.depends)? gloader.toIds(m.depends) : [];
			if (d.length > 0) {
				var includes = [];
				for (var i = 0; i < d.length; i++) {
					var requests = gloader.getRequests(m);
					var include = {async: true, ids: []};
					for (var j = 0; j < requests.length; j++) {
						requests[j].include(d[i]);
						include.ids.push(d[i]);
						if (requests[j].async === false) {	// are there any requests for this module that are sync?
							include.async = false;
						}
					}
					includes.push(include);

					if (d[i].match(/\/[^.]+$/)) {
						gloader._modules[m.id].builder.args.push(d[i]);
					}
				}

				for (var i = 0; i < includes.length; i++) {
					gloader.request(includes[i].ids, includes[i].async);
				}
			}
			else { // module is provided and has no depends
				gloader.implement(m);
			}

			gloader.resolve();
			// ====> firefox, et al exit here.
		},
		
		// check: are we expecting this module? warn user if they are including
		// a module via an inline script tag while gloader is defined
		_greet: function(modId) {
			if (gloader._expects[modId] > 0) { // were we expecting this module or not
				gloader._expects[modId]--;
			}
			else {
				var msg = "Unexpected module provided to gloader: "+modId;
				gloader._errors.push(msg);
				throw(msg);
			}
		},
		
		/** Wrapper for provide() with some specialisation for modules. */
		module: function(modDef) { /*debug*///console.log("gloader.module("+modDef.name+")");
			var modId = modDef.library[0]+"/"+modDef.library[1]+"/"+modDef.name;
			gloader._greet(modId);

			if (!modDef.depends) modDef.depends = [];
			modDef.depends.unshift(modDef.library); // modules implicitly depend on their own library
			gloader.provide(modDef);
		},
		
		/** Wrapper for provide() with some specialisation for libraries. */
		library: function(modDef) { /*debug*///console.log("gloader.library("+modDef.name+")");
			var modId = modDef.name+"/"+modDef.version+"/"+modDef.name;
			gloader._greet(modId);
			
			if (!modDef.depends) modDef.depends = [];
			modDef.library = [modDef.name, modDef.version]; // a library module is a member of its own library
			gloader.provide(modDef);
		},

		/** All dependents for a given module are available now. We can implement the module. */
		implement: function(module) { /*debug*///console.log("gloader.implement("+module.id+"), module.status is "+gloader._modules[module.id].status);
			if (gloader._modules[module.id].status != gloader.Module.PROVIDED) return;
			gloader._modules[module.id].status = gloader.Module.IMPLEMENTED;

			for (var i = 0; i < gloader._modules[module.id].builder.args.length; i++) {
				var argName = gloader._modules[module.id].builder.args[i];
				gloader._modules[module.id].builder.args[i] = gloader._modules[module.builder.args[i]].implementation;
				gloader._modules[module.id].builder.args[i].name = argName;
			}

			gloader._modules[module.id].implementation = gloader._modules[module.id].builder.apply(null, gloader._modules[module.id].builder.args);

			for (var i = 0; i < gloader._requests.length; i++) {
				gloader._requests[i].release(module.id);
			}
		},

		/** Follow chain of modules and dependents being released. */
		resolve: function() { /*debug*///console.log("gloader.resolve()");
			MODULES: for (var m in gloader._modules) {
				var module = gloader._modules[m];
				if (module.status == gloader.Module.PROVIDED) {
					for (var j = 0; j < module.depends.length; j++) {
						var dModule = gloader._modules[module.depends[j]];
						if (!dModule || dModule.status != gloader.Module.IMPLEMENTED) {
							continue MODULES;
						}
					}

					gloader.implement(module);
					gloader.resolve();
				}
			}
		},

		/** Find all requests to which a given module belong. */
		getRequests: function(m) { /*debug*///console.log("gloader.getRequests("+m.id+")");
			var requests = [];

			REQUESTS: for (var i = 0; i < gloader._requests.length; i++) {
				var request = gloader._requests[i];
				for (var j = 0; j < request.waits.length; j++) {
					if (request.waits[j] == m.id) {
						requests.push(request);
						break REQUESTS;
					}
				}
			}

			return requests;
		},

		/** Turn a nested array of module defs into a flat array of id strings. */
		toIds: function(lib) {
			var result = [];

			for (var i = 0; i < lib.length; i++) {
				var mods = lib[i];

				var libName = mods.shift(); // modifies array mods refers to
				var libVersion = mods.shift();

				var libId = libName+"/"+gloader.map.latest(libName, libVersion);

				result.push(libId+"/"+libName);

				for (var j = 0; j < mods.length; j++) {
					result.push(libId+"/"+mods[j]);
				}
			}

			return result;
		}
	};

	/**
		A request, made by the user, for one or more modules to be loaded.
		@constructor
	 */
	gloader.Request = function(r) { /*debug*///console.log("gloader.Request("+r+")");
		this.waits = [];
		this.status = gloader.Request.INITIAL;

		// normalize synonyms
		if (r.onLoad) r.onload = r.onLoad;
		if (r.onTimeout) r.ontimeout = r.onTimeout;

		// is this module implicitly meant to set global variables (no sandbox)?
		if (!r.async && !r.onload) { this.setGlobal = true; }
		this.async = (typeof r.async != "undefined")? r.async : false;
		this.onload = r.onload;

		if (r.ontimeout) {
			if (typeof r.timeout == "undefined") r.timeout = 20000; // 20 seconds
			this.timeoutRef = setTimeout(r.ontimeout, r.timeout);
		}
	}
	gloader.Request.INITIAL   = -1;
	gloader.Request.WAITING   = 0;
	gloader.Request.COMPLETED = 1;

	/** Need to wait for another module before we can complete. */
	gloader.Request.prototype.include = function(mId) { /*debug*///console.log("gloader.Request#include("+mId+")");
		for (var i = 0; i < this.waits.length; i++) {
			if (this.waits[i] == mId) return;
		}
		this.waits.push(mId);
	}

	/** Some module we are waiting for has become available, check if we can complete. */
	gloader.Request.prototype.release = function(mId) { /*debug*///console.log("gloader.Request#release("+mId+")");
		var implementCount = 0;

		for (var i = 0; i < this.waits.length; i++) {
			var wModule = gloader._modules[this.waits[i]];

			if (wModule && wModule.status == gloader.Module.IMPLEMENTED) {
				implementCount++;
			}
		}
		if (implementCount == this.waits.length) {
			this.complete();
		}
	}

	/** All modules for a request are available now. We can complete the request. */
	gloader.Request.prototype.complete = function() { /*debug*///console.log("gloader.Request#complete()");
		if (this.setGlobal) {
			for (var i = 0; i < this.waits.length; i++) {
				var gModule = gloader._modules[this.waits[i]];
				window[gModule.name] = gloader._modules[this.waits[i]].implementation
			}
		}
		
		if (this.status == gloader.Request.COMPLETED) return;
		this.status = gloader.Request.COMPLETED;

		if (this.timeoutRef) clearTimeout(this.timeoutRef);

		for (var i = 0; i < this.args.length; i++) {
			this.args[i] = gloader._modules[this.args[i]].implementation;
		}
		if (this.onload) this.onload.apply(null, this.args);
	}

	/**
		Represents a module that can be in any state of loaded.
		@constructor
	 */
	gloader.Module = function(mId) {
		this.id = mId;
		this.name = mId.split("/").pop();
		this.status = gloader.Module.INITIAL;
		this.css = gloader.map.css[mId];
	}

	gloader.Module.INITIAL     = -1;
	gloader.Module.REQUESTED   = 0;
	gloader.Module.FETCHED     = 1;
	gloader.Module.PROVIDED    = 2;
	gloader.Module.IMPLEMENTED = 3;
			
	// for modules that need to detect dom readiness, but get loaded too late...
	gloader.isReady = false;
	(function(){
		var d = document;
		if (/*@cc_on!@*/false) {
			// polling for no errors
			if (typeof window.frameElement != 'undefined') {
				// we can't use doScroll to test if we're in an iframe...
				d.attachEvent("onreadystatechange", function() {
					if (d.readyState == "complete") {
						d.detachEvent("onreadystatechange", arguments.callee);
						gloader.isReady = true;
					}
				});
			}
			else {
				(function () {
					try {
						// throws errors until after ondocumentready
						d.documentElement.doScroll('left');
					}
					catch (e) {
						setTimeout(arguments.callee, 50);
						return;
					}
					// no errors
					gloader.isReady = true;
				})();
			}
		}
		else if (typeof d.readyState != 'undefined') {
			var f = function()	{
				/loaded|complete/.test(d.readyState) ? gloader.isReady = true : setTimeout(f, 10);
			};
			f();
		}
		else {
			var callback = function () {
				if (arguments.callee.fired) { return; }
				arguments.callee.fired = true;
				if (gloader) gloader.isReady = true;
			};
			d.addEventListener("DOMContentLoaded", callback, false);
			var oldOnload = window.onload;
			window.onload = function () {
				if (oldOnload) { oldOnload(); }
				callback();
			};
		}
	})();
	
	gloader.map.setProperties = function(libraryName, props) { /*debug*///console.log("gloader.map.setProperties("+libraryName+", "+props.toSource()+")");
		if (typeof gloader.mapProps == "undefined") gloader.mapProps = {};
		if (typeof gloader.mapProps[libraryName] == "undefined") gloader.mapProps[libraryName] = {};
		for (var p in props) {
			gloader.mapProps[libraryName][p] = props[p];
		}
	}
	
	gloader.use = function(name, opts) { /*debug*///console.log("gloader.use("+name+", "+opts+")")
		name = (name || "glow");
		opts = (opts || {});
		
		var properties = {};
		for (var opts_name in opts) {
			var property_name = (opts_name.indexOf('$') == 0)? opts_name : '$'+opts_name;
			properties[property_name] = opts[opts_name];
		}
	
		// default values
		properties.$debug = (properties.$debug || "");
		properties.$base = (properties.$base || gloader._baseDir+name+"/{$version}/");
		properties.$map = (properties.$map || gloader._baseDir+name+"/map.js");
		
		gloader.map.setProperties(
			name,
			properties
		);
		gloader.map.include(properties.$map);
	};
})();

// using Resig's "degrading script" pattern.
// last script tag on the page with src=gloader.js wins.
(function() {
	var scripts = document.getElementsByTagName("script");

	for (var i = scripts.length-1; i >= 0; i--) {
		// does this script tag look like it is pointing to gloader?
		var src = scripts[i].getAttribute("src");

		var filespec = gloader.util.getGloaderFile(src);
		
		if (typeof filespec != "undefined") {
			gloader._baseDir = filespec.dir;
			
			// is the content of this script node non-empty? is so then eval the contents
			var gloaderScript = scripts[i].innerHTML;
			if (/\S/.test(gloaderScript)) {
				eval(gloaderScript);
			}
			
			// the user should have configured gloader by now, if not we configure it ourselves with defaults
			var mapped = false;
			for (var p in gloader.map._include) { mapped = true; continue; }
			if (!mapped) { gloader.use(); } // no maps mean the configuration didn't happen?
			
			break;
		}
	}
})();