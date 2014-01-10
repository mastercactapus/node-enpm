#!/usr/bin/env node
var Q = require("q");
var request = require("request");
var semver = require("semver");
var mkdirp = require("mkdirp");
var _ = require("lodash");

var versions = require("./lib/versions");
var packageData = require("./lib/package-data");
var DependencyMapper = require("./lib/dependency-mapper");
var PackageInstaller = require("./lib/package-installer");

var pkg = process.argv[2] || "";
var pkgSplit = pkg.split("@");
var pkgName = pkgSplit[0];
var pkgVers = pkgSplit[1] || "";

if (!pkgName) {
	console.error("Specify a package as first parameter: mypackage[@~0.0.1]");
	process.exit(1);
}

var depMap = new DependencyMapper();

depMap.addDependency(pkgName, pkgVers)
.then(function(){
	console.log("Installing packages...");
	return PackageInstaller.installAll("./poc", depMap.dependencies);
})
.then(function(){
	console.log("Packages installed.");
})
.catch(function(err){
	console.log(err.stack);
})
.done();
