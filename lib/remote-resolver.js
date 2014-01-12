var Q = require("q");
var request = require("request");
var url = require("url");

var _versions = require("./versions");


function Remote(registry) {
	this.registry = registry;
	this.cache = {};
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
					var modulePath = path.resolve(root, self.pkgdir, name, latest);
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
		if (this.cache[moduleName]) return Q(this.cache[moduleName]);
		
		var pkgUrl = url.resolve(self.registry, moduleName);
		return self._getJSON(pkgUrl)
		.then(function(pkgs){
			self.cache[moduleName] = pkgs;
			return pkgs;
		});
	},
	_getJSON: function(url) {
		return Q.nfcall(request, url)
		.spread(function(res,body){
			if (res.statusCode !== 200) return Q.reject(body);
			return JSON.parse(body);
		});
	}
};

module.exports = Remote;
