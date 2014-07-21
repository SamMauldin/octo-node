var octo = require("./octo");

octo.on("message", function(msg) {
	console.log(msg);
});

octo.once("peer", function() {
	octo.sendMessage(octo.id + " joined the network");
});
