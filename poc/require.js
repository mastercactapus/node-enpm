var Module = require("module");
var path = require("path");
var fs = require("fs");

function resolveDeps(paths) {
	var deps = {};
	paths.forEach(function(dirPath){
		if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return;
		fs.readdirSync(dirPath)
		.forEach(function(pkgName){
			if (!deps[pkgName]) {
				deps[pkgName] = {};
			}
			var pkgDir = path.resolve(dirPath, pkgName);
			if (!fs.existsSync(pkgDir) || !fs.statSync(pkgDir).isDirectory()) return;

			fs.readdirSync(pkgDir)
			.forEach(function(pkgVers){
				var pkgJsonPath = path.resolve(dirPath, pkgName, pkgVers, "package.json");
				if (!deps[pkgName][pkgVers] && fs.existsSync(pkgJsonPath)) {
					deps[pkgName][pkgVers] = pkgJsonPath;
				}
			});

		});
	});
	return deps;
}

var packages = resolveDeps(["node_modules"].concat(Module.globalPaths));

var packageCache = {};
var resolveLookupPaths = Module._resolveLookupPaths;
var findPath = Module._findPath;

// Module._resolveLookupPaths = function(request, parent) {
// 	return [request, Module.globalPaths]
// };

function getPackageDeps(request, parent) {
	var parentDeps = parent ? getPackageDeps(parent.filename, parent.parent) : {};
	var json = getPackageJson(request);

	var deps = {};
	_extend(deps, json.peerDependencies||{});
	_extend(deps, json.devDependencies||{});
	_extend(deps, json.dependencies||{});
	_extend(deps, parentDeps||{});

	return deps;
}
function _extend(obj, withObj) {
	var keys = Object.keys(withObj);
	keys.forEach(function(key){
		obj[key] = withObj[key];
	});
	return obj
}
function getPackageJson(filePath){
	var pkgPath = path.resolve(filePath,"package.json");
	var parentPath = path.resolve(filePath, "..");

	var json = _getPackageJson(pkgPath);
	if (json) {
		return json;
	} else if (parentPath !== filePath) {
		return getPackageJson(parentPath);
	} else {
		return {};
	}
}
var packageCache = {};
function _getPackageJson(filePath) {
	if (packageCache[filePath]) {
		return packageCache[filePath];
	} else if (fs.existsSync(filePath)) {
		return packageCache[filePath] = JSON.parse(fs.readFileSync(filePath));
	} else {
		return packageCache[filePath] = null;
	}
}

Module._findPath = function(request, paths) {
	console.log("FIND:",request,paths);



	return findPath.call(this,request, paths);
};

Module._resolveFilename = function(request, parent) {

	// if (NativeModule.exists(request)) {
	// 	return request;
	// }

	var resolvedModule = Module._resolveLookupPaths(request, parent);
	var id = resolvedModule[0];
	var paths = resolvedModule[1];
	var deps = getPackageDeps(id);
	
	var filename = Module._findPath(request, paths, parent);
	if (!filename) {
		var err = new Error("Cannot find module '" + request + "'");
		err.code = 'MODULE_NOT_FOUND';
		throw err;
	}
	return filename;
}
require("express");
