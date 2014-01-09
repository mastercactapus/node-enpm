var Q = require("q");
var _ = require("lodash");
var request = require("request");

var _utils = require("./utils");
var versions = require("./versions");

function PackageData(){
	this.packages = {};
	_.bindAll(this);
}

PackageData.prototype = {
	get: function(name){
		return this.packages[name] || this._get(name);
	},
	_get: function(name) {
		return this.packages[name] = _utils.getJSON(_utils.REPO + name);
	},
	getVersion: function(name, version) {
		return this.get(name)
		.then(function(pkgJson){
			version = versions.latest(_.keys(pkgJson.versions), version);
			if (!version) return Q.reject(new Error("Could not find version " + name + "@" + version + "\nAvailable: " +_.keys(pkgJson.versions)))
			return pkgJson.versions[version];
		});
	}
};


module.exports = new PackageData();
module.exports.PackageData = PackageData;
