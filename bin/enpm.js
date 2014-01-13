#!/usr/bin/env node

var cli = require("cli").enable("status", "version");
var enpm = require("../lib/enpm");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");

require("https").globalAgent.maxSockets = 8;
require("http").globalAgent.maxSockets = 8;

var _utils = require("../lib/utils");

//fix cli logging
console.error = _utils.log;

cli.spinner = _utils.spinner;
cli.progress = _utils.progressBar;

cli.version = require("../package").version;
cli.parse({
	"registry": ["r","Registry to search","url"],
	"registry2": ["r2","Second registry to search", "url"]
});

cli.main(function(args,options){
	var command = args.shift();
	if (!command) return cli.getUsage();
	
	enpm.setOptions(_.omit(options, function(opt, key){
		return opt === null;
	}));
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
				enpm.install(dir, pkgs).done();
			} else if (command === "update") {
				enpm.update(dir, pkgs).done();
			}
		break;
		case "config":
		var getset = args.shift();
		if (getset === "get") {
			var prop = args.shift().split(".");
			var out = enpm.options[prop[0]];
			if (prop.length>1) {
				out = out ? out[prop[1]] : "";
			}
			console.log(out||"");
		} else if (getset === "set") {
			var obj = {};
			var prop = args.shift().split(".");
			var val = args.shift();
			if (prop.length > 1) {
				obj[prop[0]] = {};
				obj[prop[0]][prop[1]] = val;
			} else {
				obj[prop[0]] = val;
			}
			enpm.updaterc(obj);
		} else if (getset === "unset") {
			enpm.unsetrc(args.shift());
		} else {
			cli.error("To use config: enpm config get|set|unset <keyname> <keyvalue>");
			cli.getUsage();
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