var octonode = require("./index");

octonode.on("message", function(msg, id) {
	if (msg == "woof") {
		octonode.sendMessage("HISS");
	}
});
