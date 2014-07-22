var octo = require("./lib/octo");
var tools = require("./lib/tools");

var wholenet = [];

octo.on("message", function(msg, core) {
	if (core) {
		try {
			var msg = tools.unpack(msg);
		} catch (e) { }
		if (msg) {
			if (msg["id"] && msg["ips"]) {
				var found = false;
				wholenet.forEach(function(v) {
					if (v.id == msg["id"]) {
						v.ping = true;
						found = true;
					}
				});
				if (!found) {
					wholenet.push({
						ping: true,
						id: msg["id"],
						ips: msg["ips"]
					});
				}
			}
		}
	}
});

setInterval(function() {
	var toRemove = [];
	wholenet.forEach(function(v) {
		if (!v.ping) {
			toRemove.push(v.id);
		} else {
			v.ping = false;
		}
	});
	toRemove.forEach(function(id) {
		var newnet = [];
		wholenet.forEach(function(v) {
			if (v.id != id) {
				newnet.push(JSON.parse(JSON.stringify(v)));
			}
		});
		wholenet = newnet;
	});
}, 1000 * 60);

setInterval(function() {
	octo.sendMessage(tools.pack({
		id: octo.id,
		ips: octo.ips
	}), true);
}, 1000 * 30);

octo.once("peer", function() {
	octo.sendMessage(octo.id + " joined the network", true);
});

module.exports = octo;

module.exports.getNetwork = function() {
	return wholenet;
};

module.exports.getDataUsage = tools.getDataUsage;
