var PackageData = require("./package-data");
var versions = require("./versions");
var _ = require("lodash");
var Q = require("q");

function DependencyMapper(){
	this.dependencies = {};
}
DependencyMapper.prototype = {
	addDependencies: function(obj) {
		var self =this;

		return Q.all(_.map(obj, function(semver,name){
			return self.addDependency(name,semver);
		}));
	},
	addDependency: function(name, semVersion) {
		var self = this;

		if (this._isSatisfied(name, semVersion)) return Q(this);
		else {
			return PackageData.getVersion(name,semVersion)
			.then(function(json){

				//go by the package.json, in case we can have fuzzy names at some point -- I have no clue why tho :)
				self._addDependency(json.name, json.version);

				return Q.all(_.map(json.dependencies||{}, function(semVersion, name) {
					return self.addDependency(name, semVersion);
				}));
			})
			.thenResolve(this);
		}
	},
	_addDependency: function(name, version) {
		if (!this.dependencies[name]) this.dependencies[name] = [];
		if (this.dependencies[name].indexOf(version) === -1) {
			this.dependencies[name].push(version);
			console.log("DEP:",name,version);
		}
	},
	_isSatisfied: function(name, semVersion) {
		if (!this.dependencies[name]) return false;

		//coerce a boolean of a valid version being found.
		return !!versions.latest(this.dependencies[name], semVersion);
	}
};

module.exports = DependencyMapper;
