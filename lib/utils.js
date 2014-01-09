var Q = require("q");
var request = require("request");
var child = require("child_process");

var lastProgress = "";

module.exports = {
	REPO: "http://registry.npmjs.org/",
	get:function(url) {
		return Q.nfcall(request, {
			uri: url,
			encoding: null
		})
		.spread(function(res, body){
			if (!res.statusCode === 200) {
				return Q.reject(body);
			} else {
				return body;
			}
		});
	},
	getJSON: function(url) {
		return this.get(url)
		.then(JSON.parse);
	},
	exec: function(cmd,opts) {
		opts = opts||{};
		return Q.nfcall(child.exec, cmd, opts||{})
		.spread(function(stderr,stdout){
			return stdout;
		});
	},
	log: function(message) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(message + "\n");
		this.progress();
	},
	progress: function(progressLine){
		if (typeof progressLine !== "undefined") {
			lastProgress = progressLine;
		} else {
			progressLine = lastProgress;
		}
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(progressLine);
	}
};
