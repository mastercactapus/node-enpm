var Q = require("q");
var _ = require("lodash");
var request = require("request");

var _utils = require("./utils");
var _versions = require("./versions");
var log = require("npmlog");

function PackageData(packageResolvers){
	this.cache = {};
	this.resolvers = packageResolvers;
	_.bindAll(this);
}

PackageData.prototype = {
	_saveCache: function(name, version, json) {
		this.cache[name] = this.cache[name] || {};
		this.cache[name][version] = json;
		return json;
	},
	_getCache: function(name, wanted) {
		var versions = this.cache[name] ? Object.keys(this.cache[name]) : [];
		var latest = _versions.latest(versions, wanted);
		
		return latest ? this.cache[name][latest] : null;
	},
	getVersion: function(name, wanted, resolvers) {
		var self = this;
		
		resolvers = (resolvers || self.resolvers).slice(0);
		wanted = wanted || "*";
		
		var cached = self._getCache(name,wanted);
		
		if (cached) return Q(cached);

		if (resolvers.length === 0) {
			return Q.reject(new Error(
				"Could not find package: " + name + "@" + wanted));
		} else {
			var resolver = resolvers.shift();
			
			return resolver.getVersion(name, wanted)
			.then(function(json){
				self._saveCache(json.name, json.wanted, json);
				return json;
			})
			.catch(function(err){
				log.debug("PKG_NOTFOUND", err.message);
				return self.getVersion(name,wanted,resolvers);
			});
		}
	}
};

module.exports = PackageData;
