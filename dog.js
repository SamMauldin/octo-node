var octonode = require("./index");

octonode.on("peer", function() {
	octonode.sendMessage("woof");
});
