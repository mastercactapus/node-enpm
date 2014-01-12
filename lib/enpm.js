

function enpm(options) {
	if (options) this.setOptions(options);
}

enpm.prototype = {
	setOptions: function(options) {
		
	},
	install: function(root, packages) {
		console.log("install");
		console.log("root", root);
		console.log("packges", packages);
	},
	update: function(root, packages) {
		console.log("install");
		console.log("root", root);
		console.log("packges", packages);
		
	}
};


module.exports = new enpm();
module.exports.enpm = enpm;
