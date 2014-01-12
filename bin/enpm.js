#!/usr/bin/env node

var cli = require("cli").enable("status", "version");
var enpm = require("../lib/enpm");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");

cli.version = require("../package").version;
cli.parse({
	"registry": ["r","Registry to search","url"],
	"registry2": ["r2","Second registry to search", "url"]
});

cli.main(function(args,options){
	var command = args.shift();
	if (!command) return cli.getUsage();
	
	enpm.setOptions(options);
	enpm.setOptions({
		logger: cli
	});

	//install/update -- no packages -> find package.json, and then node_modules
	// otherwise find nearest node_modules and install there

	switch (command) {
		case "install": case "update":
			var dir,pkgs,jsonPath;
			jsonPath = getPkgJsonPath();
			if (jsonPath) {
				dir = path.join(path.dirname(jsonPath), "node_modules");
			}
			if (args.length) {
				if (!dir) {
					dir = findNodeModulesDir();
				}
				pkgs = parsePackages(args);
			} else {
				if (!jsonPath) {
					cli.fatal("Could not find package.json in any directory from here to root");
				}
				pkgs = getPkgJsonDeps(jsonPath);
			}
			if (command === "install") {
				enpm.install(dir, pkgs);
			} else if (command === "update") {
				enpm.update(dir, pkgs);
			}
		break;
		default:
		cli.error("Unknown command: " + command);
		cli.getUsage();
	}
});

function findNodeModulesDir(dir) {
	dir = dir || process.cwd();
	var modulesDir = path.join(dir, "node_modules");
	if (fs.existsSync(modulesDir)) {
		return modulesDir;
	} else {
		var newDir = path.dirname(dir);
		if (newDir === dir) {
			return path.join(process.cwd(), "node_modules");
		} else {
			return findNodeModulesDir(newDir);
		}
	}
}

function getPkgJsonPath(dir) {
	dir = dir || process.cwd();
	var pkgJsonPath = path.join(dir,"package.json");
	if (fs.existsSync(pkgJsonPath)) {
		return pkgJsonPath;
	} else {
		var newDir = path.dirname(dir);
		if (newDir === dir) {
			return null;
		} else {
			return getPkgJsonPath(newDir);
		}
	}
}
function getPkgJsonDeps(pkgJsonPath) {
	var json = require(pkgJsonPath);
	return _.extend({},
		json.dependencies||{},
		json.devDependencies||{},
		json.peerDependencies||{});
}

function parsePackages(packageList) {
	var packageMap = {};
	packageList.forEach(function(pkg){
		var split = pkg.split("@");
		packageMap[split[0]] = split[1] || "*";
	});
	return packageMap;
}