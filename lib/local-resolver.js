var path = require("path");
var glob = require("glob");

var _versions = require("./versions");


function Local(root, pkgdir) {
	this.root = root;
	this.pkgdir = pkgdir || ".packages";
}

Local.prototype = {
	getVersion: function(name, wanted) {
		var json = null;
		var versions = this.versions(name);
		var latest = _versions.latest(versions, wanted);
		
		if (latest) {
			var modulePath = path.resolve(root, this.pkgdir, name, latest);
			json = {
				name: name,
				version: latest,
				local: true,
				path: modulePath,
				pkg: require(path.join(modulePath, "package.json"))
			};
		}
		
		return json;
	},
	versions: function(moduleName) {
		return glob.sync(path.join(root, this.pkgdir, moduleName, "*/"))
		.map(function(dir){
			return path.basename(dir);
		});
	}
};

module.exports = Local;
