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
	this.progress = _.throttle(this.progress, 50);
}

Downloader.prototype = {
	reset: function(){
		this.total = 0;
		this.finished = 0;
		this.toDownload = -1;
		this.toRespond = -1;
		this.log.spinner(null);
		this.log.progress(null);
	},
	downloadAndExtract: function(packages) {
		var self = this;
		if (packages.length === 0) return Q();
		var download = this._makeDownloadArray(packages);
		this.reset();
		this.progress();
		this.toDownload = download.length;
		this.toRespond = download.length;
		//yes it's important
		var s = download.length > 1 ? "s" : "";
		this.log.info("Downloading " + download.length + " package" + s);
		this.progress(0);
		return Q.all(download.map(this._download))
		.then(function(){
			self.reset();
		})
	},
	progress: function() {
		if (this.toDownload === 0) {
			this.log.spinner("Extracting packages");
			this.toDownload = -1;
		}
		if (this.total === this.finished || this.total < 1) return _utils.progressBar(-1);
		if (this.toRespond) {
			this.log.spinner("");
		} else {
			this.log.progress(this.finished/this.total);
		}
	},
	_download: function(download, hasSize) {
		var self = this;
		var defer = Q.defer();
		var len = 0;
		
		request({
			uri: download.tarball,
			encoding: null
		})
		.on("response", function(res){
			if (!hasSize) {
				len = res.headers["content-length"]||0;
				self.total += +len;
				self.toRespond--;
				self.progress();
			}
		})
		.on("data", function(data){
			self.finished += +data.length;
			self.progress();
		})
		.on("end", function(){
			self.toDownload--;
			self.progress();
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
