var Q = require("q");
var _ = require("lodash");
var mkdirp = require("mkdirp");
var path = require("path");
var fs = require("fs");

var PackageData = require("./package-data");
var LocalResolver = require("./local-resolver");
var RemoteResolver = require("./remote-resolver");
var DependencyMapper = require("./dependency-mapper");
var PackageDownloader = require("./package-downloader");

function enpm(options, logger) {
	this.options = {};
	this.setOptions(enpm.defaults);
	this.loadConfig();
	if (options) this.setOptions(options);
	this.log = logger || require("./logger-api");
}
enpm.defaults = {
	registry: "https://registry.npmjs.org/"
};

enpm.prototype = {
	loadConfig: function(configFile) {
		if (!configFile) {
			configFile = ""; //npmrc
		}
		
		var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
		var rcfile = path.join(home, ".npmrc");
		this.rcfile = rcfile;

		var config = this.readrc();

		//read npmrc file
		//mix in defaults
		
		this.setOptions(config);
		return this;
	},

	unsetrc: function(key) {
		var cfg = this.readrc();
		var split = key.split(".");

		if (split.length > 1) {
			if (!cfg[split[0]]) return;
			delete cfg[split[0]][split[1]];
		} else {
			delete cfg[split[0]];
		}

		this.writerc(cfg);
	},

	updaterc: function(config) {
		var cfg = this.readrc();
		this.writerc(_.merge(cfg, config));
	},

	writerc: function(config){
		var sections = [];
		var lines = [];
		_.each(config, function(value, name){
			if (_.isObject(value)) {
				sections.push("[" + name + "]");
				_.each(value, function(val, nam){
					sections.push(nam + " = " + val.toString());
				});
				sections.push("");
			} else {
				lines.push(name + " = " + value.toString());
			}
		});
		lines.push("");
		var data = lines.concat(sections).join("\n");
		fs.writeFileSync(this.rcfile, data);
	},

	readrc: function() {
		var config = {};
		if (!fs.existsSync(this.rcfile)) return config;

		var data = fs.readFileSync(this.rcfile).toString()
		.split(/^/m)
		.map(function(line){
			return line.trim();
		});
		data = _.filter(data);

		var obj = config;
		data.forEach(function(line){
			if (m = /^(.+?)\s*=.\s*(.+?)$/.exec(line)) {
				obj[m[1]] = m[2];
			} else if (m = /^\[(.+)\]$/.exec(line)) {
				config[m[1]] = obj = {};
			}
		});

		return config;
	},

	setOptions: function(options) {
		_.extend(this.options, options||{});
		if (this.options.logger) {
			this.log = this.options.logger;
		}
		return this;
	},
	install: function(root, packages) {
		var resolvers = this.getResolvers(root);
		return this._install(resolvers, root, packages);
	},
	update: function(root, packages) {
		//dont pass root, update should get latest only
		var resolvers = this.getResolvers();
		return this._install(resolvers, root, packages);
	},
	_install: function(resolvers, root, packages) {
		var self = this;
		var pkgData = new PackageData(resolvers, this.log);
		var mapper = new DependencyMapper(pkgData, this.log);
		var downloader = new PackageDownloader(root, this.log);

		// self.log.info("Resolving package data");
		return Q.all(_.map(packages, function(wantedVersion, name){
			return mapper.addDependency(name, wantedVersion);
		}))
		.then(mapper.getDependencies)
		.then(function(dependencies){
			var toDownload = _.filter(dependencies, function(dep){
				return !dep.local;
			});
			
			return downloader.downloadAndExtract(toDownload);
		})
		.then(mapper.getDependencyMap)
		.then(function(dependencyMap){
			self.log.info("Linking packages");
			self._linkPackages(root, dependencyMap);
			
			var topDependencies = packages;
			var topMap = mapper.getTopDependencyMap(topDependencies);
			self._link(root, root, topMap);

			return topMap;
		});
	},
	_link: function(root, target, dependencies) {
		var self = this;
		mkdirp.sync(target);
		_.each(dependencies, function(depVersion, depName){
			var linkName = path.resolve(target, depName);
			var depPath = path.resolve(root,".packages", depName, depVersion);
			if (fs.existsSync(linkName)) {
				if (fs.lstatSync(linkName).isSymbolicLink()) {
					fs.unlinkSync(linkName);
				} else {
					self.log.error("Could not link " + depName + "@" + depVersion + " to " + path.relative(process.cwd(),linkName) + " file exists and is not a link");
					return;
				}
			}
			
			fs.symlinkSync(depPath, linkName, "file");
		});
	},
	_linkPackages: function(root, dependencyMap){
		var self = this;
		_.each(dependencyMap, function(versions, name){
			_.each(versions, function(deps, version){
				var moduleDir = path.resolve(root, ".packages", name, version, "node_modules");
				self._link(root, moduleDir, deps);
			});
		});
	},
	getResolvers: function(root) {
		var self = this;
		var resolvers = [];
		
		if (root) {
			resolvers.push(new LocalResolver(root, self.log));
		}
		
		// this will break if you have over 10 registry entries
		// being lazy and leave it for now with a warning just in case
		var registryKeys = Object.keys(self.options).filter(function(key){
			return (/^registry(\d+)?/).test(key);
		}).sort();
		if (registryKeys.length > 9) {
			self.log.warn("Having 10 or more registries is not supported, and priorities will not be correct due to Array.prototype.sort()");
		}
		
		return resolvers.concat(registryKeys.map(function(key){
			return new RemoteResolver(self.options[key], self.log);
		}));
	}
};


module.exports = new enpm();
module.exports.enpm = enpm;
