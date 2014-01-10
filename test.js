var Module = require("module");



Module._resolveFilename = function(request, parent){
	if (Object.hasOwnProperty(process.binding("natives"), request)) {
		return request;
	}
	
	var filename;

	console.log(parent);
	if (!filename) {
		var err = new Error("Cannot find module '" + request + "' from '" + parent.filename + "'");
		err.code = "MODULE_NOT_FOUND";
		throw err;
	}
	return filename;
};
require("q/queue");
require("express");

