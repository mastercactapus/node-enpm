var request = require("request");
var crypto = require('crypto');
var _ = require("lodash");
var tar = require("tar");
var path = require("path");
var Q = require("q");
var fs = require("fs");
var zlib = require("zlib");
var _utils = require("./utils");

function Downloader(root, logger) {
	this.root = root;
	this.log = logger||require("./logger-api");
	_.bindAll(this);
	this.pkgDir = ".packages";
	
	this.total = 0;
	this.finished = 0;
}

Downloader.prototype = {
	reset: function(){
		this.total = 0;
		this.finished = 0;
	},
	downloadAndExtract: function(packages) {
		if (packages.length === 0) return Q();
		var download = this._makeDownloadArray(packages);
		this.reset();
		this.total = download.length;
		this.progress();
		//yes it's important
		var s = download.length > 1 ? "s" : "";
		this.log.info("Downloading and extracting " + download.length + " package" + s);
		return Q.all(download.map(this._download));
	},
	progress: function() {
		if (this.total === this.finished || this.total < 1) return _utils.progressBar(-1);
		this.log.progress(this.finished/this.total);
	},
	_download: function(download) {
		var self = this;
		var defer = Q.defer();
		
		request({
			uri: download.tarball,
			encoding: null
		})
		.pipe(zlib.createUnzip())
		.pipe(tar.Extract({
			path: download.target,
			strip: 1
		}))
		.on("error", defer.reject)
		.on("end", function(){
			self.log.debug("Extracted " + path.basename(download.tarball) + " to " + path.relative(process.cwd(),download.target));
			self.finished++;
			self.progress();
			defer.resolve();
		});
		
		return defer.promise;
	},
	
	_makeDownloadArray: function(packages) {
		var self = this;
		return _.map(packages, function(json){
			var url = json.pkg.dist.tarball;
			return {
				tarball: url,
				target: path.resolve(self.root, self.pkgDir, json.name, json.version)
			};
		});
	},
	_sum: function(string) {
		var shasum = crypto.createHash('sha1');
		return shasum.digest("hex");
	}
};

module.exports = Downloader;
