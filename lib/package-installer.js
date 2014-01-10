var PackageData = require("./package-data");
var mkdirp = require("mkdirp");
var _ = require("lodash");
var Q = require("q");
var request = require("request");
var _utils = require("./utils");
var tmp = require("tmp");
var fs = require("fs");
var path = require("path");

function PackageInstaller() {
	_.bindAll(this);
	this.numWorking = 0;
}

PackageInstaller.prototype = {
	install: function(baseDir, pkgName, pkgVersion) {
		var self = this;
		var installDir = path.resolve(baseDir, pkgName, pkgVersion);

		this.numWorking++;
		_utils.progress("Installing packages... (" + self.numWorking + " remaining)");

		return Q.nfcall(mkdirp, installDir)
		.then(function(){
			return PackageData.get(pkgName);
		})
		.then(function(pkgJson){
			var url = pkgJson.versions[pkgVersion].dist.tarball;
			return _utils.get(url);
		})
		.then(function(tarballData) {
			return self._extractTgz(installDir, tarballData);
		})
		.then(function(){
			//run preinstall, install, postinstall
		})
		.finally(function(){
			_utils.log("Installed: " + pkgName + "@" + pkgVersion);
			self.numWorking--;
			if (self.numWorking === 0) {
				_utils.progress("")
			} else {
				_utils.progress("Installing packages... (" + self.numWorking + " remaining)");
			}
		});
	},
	_extractTgz: function(installDir, tarballData) {
		return Q.nfcall(tmp.file)
		.spread(function(filePath, fd){
			var tarCmd = "tar xzf " + filePath + " -C " + installDir + " --strip-components=1";
			return Q.nfcall(fs.writeFile, filePath, tarballData)
			.then(Q.fbind(_utils.exec, tarCmd));
		});
	},
	installAll: function(baseDir, depedencyObj) {
		var self = this;
		_utils.progress("Installing packages... (")
		return Q.all(_.map(depedencyObj, function(versions, pkgName){
			return Q.all(versions.map(function(pkgVersion){
				return self.install(baseDir, pkgName, pkgVersion);
			}));
		}));
	}
};

module.exports = new PackageInstaller();
module.exports.PackageInstaller = PackageInstaller;
