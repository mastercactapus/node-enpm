var _versions = require("./versions");
var _ = require("lodash");
var Q = require("q");

function DependencyMapper(packageData, logger){
	this.dependencies = {};
	this.packageData = packageData;
	this.log = logger || require("./logger-api");
	this.resolving = 0;
}
DependencyMapper.prototype = {
	reset: function() {
		this.resolving = 0;
		this.dependencies = {};
	},
	progress: function(){
		this.log.spinner("",true);
		if (this.resolving > 0)
			this.log.spinner("Fetching data for " + this.resolving + " packages");
	},
	addDependency: function(name, wantedVersion) {
		var self = this;

		if (self._isSatisfied(name, wantedVersion)) {
			self.log.debug("SKIP " + name + "@" + wantedVersion);
			return Q(self);
		} else {
			self.resolving++;
			self.progress();
			return self.packageData.getVersion(name,wantedVersion)
			.then(function(json){

				self._addDependency(json);

				return Q.all(_.map(json.pkg.dependencies||{}, function(wantedVersion, name) {
					return self.addDependency(name, wantedVersion);
				}))
				.then(Q.all(_.map(json.pkg.peerDependencies||{}, function(wantedVersion, name){
					return self.addDependency(name, wantedVersion);
				})));
			})
			.thenResolve(self);
		}
	},
	_addDependency: function(json) {
		this.resolving--;
		this.progress();
		if (!this.dependencies[json.name]) this.dependencies[json.name] = {};
		if (this.dependencies[json.name][json.version]) return;

		this.dependencies[json.name][json.version] = json;
		this.log.debug("DEPENDENCY " + json.name + "@" + json.version);
	},
	_isSatisfied: function(name, wantedVersion) {
		if (!this.dependencies[name]) return false;
		var versions = Object.keys(this.dependencies[name]);
		var latest = _versions.latest(versions, wantedVersion);
		return !!latest;
	}
};

module.exports = DependencyMapper;
