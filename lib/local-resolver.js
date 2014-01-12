var path = require("path");
var glob = require("glob");

var _versions = require("./versions");


function Local(root, pkgdir) {
	this.root = root;
	this.pkgdir = pkgdir || ".packages";
}

Local.prototype = {
	getPkgJson: function(name, version) {
		return require(path.resolve(this.root, this.pkgDir,
			name, version, "package.json"));
	},
	getVersion: function(name, wanted) {
		var json = null;
		var versions = this.getVersions(name);
		var latest = _versions.latest(versions, wanted);
		
		if (latest) {
			var modulePath = path.resolve(this.root, this.pkgDir, name, latest);
			json = {
				name: name,
				version: latest,
				local: true,
				path: modulePath,
				pkg: this.getPkgJson(name, latest)
			};
		}
		
		return json;
	},
	getVersions: function(moduleName) {
		return glob.sync(path.join(this.root, this.pkgDir, moduleName, "*/"))
		.map(function(dir){
			return path.basename(dir);
		});
	}
};

module.exports = Local;
