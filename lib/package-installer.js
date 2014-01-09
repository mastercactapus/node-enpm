var PackageData = require("./package-data");
var mkdirp = require("mkdirp");
var _ = require("lodash");
var Q = require("q");
var request = require("request");
var _utils = require("./utils");
var tmp = require("tmp");
var fs = require("fs");
var path = require("path");
var versions = require("./versions");

function PackageInstaller() {
	_.bindAll(this);
	this.numWorking = 0;
}

PackageInstaller.prototype = {
	linkAll: function(baseDir, dependencyObj) {
		var self = this;

		_.each(dependencyObj, function(packageversions, packagename){
			_utils.progress("Linking " + packagename + "... ");
			_.each(packageversions, function(packageversion){
				self.link(baseDir, packagename, packageversion, dependencyObj);
			});
		});

		_utils.progress("");
	},
	link: function(baseDir, pkgName, pkgVersion, dependencyObj) {
		var installDir = path.resolve(baseDir, pkgName, pkgVersion);
		var nmDir = path.join(installDir, "node_modules");
		mkdirp.sync(nmDir);

		var json = require(path.join(installDir, "package"));
		_.each(json.dependencies||{}, function(wanted, depName){
			var latest = versions.latest(dependencyObj[depName], wanted);
			var dest = path.resolve(baseDir, depName, latest);
			var src = path.join(nmDir, depName);
			if (fs.existsSync(src)) fs.unlinkSync(src);
			fs.symlinkSync(dest, src, "dir");
		});
	},
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

		.finally(function(){
			_utils.log("Extracted: " + pkgName + "@" + pkgVersion);
			self.numWorking--;
			if (self.numWorking === 0) {
				_utils.progress("")
			} else {
				_utils.progress("Fetching packages... (" + self.numWorking + " remaining)");
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
		}))
		.then(function(){
			return self.linkAll(baseDir, depedencyObj);
		});
	}
};

module.exports = new PackageInstaller();
module.exports.PackageInstaller = PackageInstaller;
