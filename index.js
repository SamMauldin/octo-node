var octo = require("./octo");

octo.on("message", function(msg) {
	console.log(msg);
});

setTimeout(function() {
	octo.sendMessage("It's a me! " + octo.id + "!");
}, 5000);
