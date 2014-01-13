var Q = require("q");
var request = require("request");
var url = require("url");

var _versions = require("./versions");


function Remote(registry, logger) {
	this.registry = registry;
	this.cache = {};
	this.log = logger || require("./logger-api");
	this.name = "REMOTE:" + registry;
}
Remote.prototype = {
	getPkgJson: function(moduleName, version) {
		return this.getPkg(moduleName)
		.then(function(pkgs){
			return pkgs.versions[version] || null;
		});
	},
	getVersion: function(moduleName, wanted) {
		var self = this;
		
		var json = null;
		return self.getVersions(moduleName)
		.then(function(versions){
			var latest = _versions.latest(versions, wanted);
			
			if (latest) {
				return self.getPkgJson(moduleName, latest)
				.then(function(pkgJson){
					return {
						name: moduleName,
						version: latest,
						remote: true,
						path: pkgJson.dist.tarball,
						pkg: pkgJson
					};
				});
			} else {
				return null;
			}
		});
	},
	getVersions: function(moduleName) {
		return this.getPkg(moduleName)
		.then(function(pkgs){
			return Object.keys(pkgs.versions);
		})
		.catch(function(err){
			return [];
		});
	},
	getPkg: function(moduleName) {
		var self = this;
		if (self.cache[moduleName]) return Q(self.cache[moduleName]);
		
		var pkgUrl = url.resolve(self.registry, moduleName);
		self.cache[moduleName] = self._getJSON(pkgUrl)
		.then(function(pkgs){
			return pkgs;
		});
		
		return self.cache[moduleName];
	},
	_getJSON: function(url) {
		var self = this;
		self.log.debug("GET " + url);
		return Q.nfcall(request, {
			uri: url
		})
		.spread(function(res,body){
			if (res.statusCode !== 200) {
				self.log.debug("FAIL " + res.statusCode + " " + url);
				return Q.reject(body);
			}
			return JSON.parse(body);
		})
		.catch(function(err) {
			self.log.error("REQUEST FAILED: " + url);
			self.log.error(err.message);
			return Q.reject(err);
		});
	}
};

module.exports = Remote;
