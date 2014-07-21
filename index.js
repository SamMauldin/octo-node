var octo = require("./octo");

var wholenet = [];

octo.on("message", function(msg, core) {
	if (core) {
		try {
			var msg = JSON.parse(msg);
		} catch (e) { }
		if (msg) {
			if (msg["id"]) {
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
						id: msg["id"]
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
	console.log("Approximate Netsize: " + wholenet.length);
}, 1000 * 60);

setInterval(function() {
	octo.sendMessage(JSON.stringify({
		id: octo.id
	}), true);
}, 1000 * 30);

octo.once("peer", function() {
	octo.sendMessage(octo.id + " joined the network", true);
});

module.exports = octo;
