#!/usr/bin/env node
var Q = require("q");
var request = require("request");
var semver = require("semver");
var mkdirp = require("mkdirp");
var _ = require("lodash");
var path = require("path");
var fs = require("fs");

var versions = require("./lib/versions");
var packageData = require("./lib/package-data");
var DependencyMapper = require("./lib/dependency-mapper");
var PackageInstaller = require("./lib/package-installer");

if (process.argv[2] !== "install") {
	console.error("only install is supported at this time");
	process.exit(1);
}
var pkg = process.argv[3] || "";
var pkgSplit = pkg.split("@");
var pkgName = pkgSplit[0];
var pkgVers = pkgSplit[1] || "";

var depMap = new DependencyMapper();

var deps = {};
if (!pkgName) {
	if (fs.existsSync("package.json")) {
		deps = JSON.parse(fs.readFileSync("package.json")).dependencies||{};
	} else {
		console.error("You must specify a package, or run this in a directory with package.json");
		process.exit(1);
	}
} else {
	deps[pkgName] = pkgVers;
}

depMap.addDependencies(deps)
.then(function(){
	console.log("Installing packages...");
	return PackageInstaller.installAll("node_modules/.packages", depMap.dependencies);
})
.then(function(){
	_.each(deps, function(semver, name){
		var latest = versions.latest(depMap.dependencies[name], semver);
		var dest = path.resolve("node_modules/.packages", name, latest);
		var linkname = path.join("node_modules",name);
		if (fs.existsSync(linkname)) fs.unlinkSync(linkname);
		fs.symlinkSync(dest, linkname, "dir");
	});
})
.then(function(){
	console.log("Packages installed.");
})
.catch(function(err){
	console.log(err.stack);
})
.done();
