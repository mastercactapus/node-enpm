var versions = require("./versions");
var _ = require("lodash");
var Q = require("q");
var log = require("npmlog");

function DependencyMapper(packageData){
	this.dependencies = {};
	this.packageData = packageData;
}
DependencyMapper.prototype = {
	reset: function() {
		this.dependencies = {};
	},
	addDependencies: function(obj) {
		var self =this;

		return Q.all(_.map(obj, function(semver,name){
			return self.addDependency(name,semver);
		}));
	},
	addDependency: function(name, semVersion) {
		var self = this;

		if (self._isSatisfied(name, semVersion)) return Q(self);
		else {
			return self.packageData.getVersion(name,semVersion)
			.then(function(json){

				//go by the package.json, in case we can have fuzzy names at some point -- I have no clue why tho :)
				self._addDependency(json.name, json.version);

				return Q.all(_.map(json.pkg.dependencies||{}, function(semVersion, name) {
					return self.addDependency(name, semVersion);
				}))
				.then(Q.all(_.map(json.pkg.peerDependencies||{}, function(semVersion, name){
					return self.addDependency(name, semVersion);
				})));
			})
			.thenResolve(self);
		}
	},
	_addDependency: function(name, version) {
		if (!this.dependencies[name]) this.dependencies[name] = [];
		if (this.dependencies[name].indexOf(version) === -1) {
			this.dependencies[name].push(version);
			log.debug("DEPENDENCY", name + "@" + version);
		}
	},
	_isSatisfied: function(name, semVersion) {
		if (!this.dependencies[name]) return false;

		//coerce a boolean of a valid version being found.
		return !!versions.latest(this.dependencies[name], semVersion);
	}
};

module.exports = DependencyMapper;
