var path = require("path");
var Module = require("module");
var versions = require("versions");

function Resolver(){
	this.packageJsonCache = {};
}

Resolver.prototype = {
	_recursiveFind: function(dir, filename) {
		var paths = this._makePaths(dir);

		for (var idx=0;i<paths.length;i++){
			if (fs.existsSync(paths[i])) {
				return paths[i];
			}
		}
		return null;
	},
	_makePaths: function(dir){
		var dir = path.resolve(dir);
		var pathParts = dir.split(path.sep);
		var paths = [];
		for (var tip = pathParts.length;tip>0;tip--){
			var pkgPath = pathParts.slice(0,tip).concat(filename).join(path.sep);
			paths.push(pkgPath);
		}
		return paths;
	},
	_readJSON: function(filename) {
		return this.packageJsonCache[filename] || (this.packageJsonCache[filename] = JSON.parse(fs.readFileSync(filename)));
	},
	_getPackageJson: function(dir) {
		var pkgPath = this._recursiveFind(dir, "package.json");
		if (!pkgPath) {
			return null;
		}
		return this._readJSON(pkgPath);
	},
	_readdirSafe: function(dir) {
		try{
			return fs.readdirSync(dir);
		} catch (err) {
			return [];
		}
	},
	_getModuleDir: function(paths, moduleName, semver){
		for (var idx=0;i<paths.length;i++){
			var dirs = this._readdirSafe(path.join(paths[idx], moduleName));
			var latest = versions.latest(dirs);
			if (latest) {
				return path.join(paths[idx], moduleName, latest);
			}
		}

		return null;
	},

	_getRequiredVersion: function(dir, moduleName) {
		var json = _getPackageJson(dir);
		if (!json) {
			return "";
		}

		if (json.dependencies && json.dependencies[moduleName]) {
			return json.dependencies[moduleName];
		} else if (json.devDependencies && json.devDependencies[moduleName]) {
			return json.devDependencies[moduleName];
		} else if (json.peerDependencies && json.peerDependencies[moduleName]) {
			return json.peerDependencies[moduleName];
		} else {
			return "";
		}
	},
	_try: function(fn /* args... */) {
		try {
			return fn.apply(this, arguments);
		} catch(err) {
			//do nothing
		}
	},
	_tryFile: function (requestPath) {
		var stats = this._try(fs.statSync, requestPath);
		if (stats && !stats.isDirectory()) {
			return fs.realpathSync(requestPath, Module._realpathCache);
		}
		return false;
	},
	_tryExtensions: function(requestPath, extensions) {
		for (var i=0, len=extensions.length; i<len; i++) {
			var filename = this._tryFile(requestPath + extensions[i]);
			if (filename) {
				return filename;
			}
		}
		return false;
	},
	resolve: function(request, parent) {
		var split = request.split("/");
		var moduleName = split[0];
		var dir = path.resolve(path.dirname(parent.filename));
		var semver = this._getRequiredVersion(dir, moduleName);
		var paths = this._makePaths(dir);
		var moduleDir = this._getModuleDir(paths, moduleName, semver);

		var json = this._readJSON(path.join(moduleDir, "package.json"));

		var filename;
		if (split.length === 0) {
			filename = path.join(moduleDir, json.main || "index");
		} else {
			filename = path.join(moduleDir, split.slice(1).join("/"));
		}

		
	}
};

module.exports = new Resolver();
module.exports.Resolver = Resolver;

