var cfg, ss;
try {
	cfg = require("./config.json");
	ss = require("smokesignal");
} catch(e) {
	console.log("Error launching octo-node");
}

if (!cfg) {
	console.log("No config found.");
	console.log("Please edit example-config.json and save it to config.json");
	return;
}

if (!ss) {
	console.log("Smokesignal not installed.");
	console.log("Please run npm install");
}

var node = ss.createNode({
	port: cfg.server.port,
	address: cfg.server.address,
	seeds: cfg.seeds,
	maxPeerNo: cfg.server.maxPeers,
	minPeerNo: 1
});

var connected = false;

function handleDisconnect(reconn) {
	if (connected && !reconn) {
		connected = false;
		console.log("Disconnected from network!");
		if (cfg.seeds.length != 0) {
			console.log("Attempting to reconnect in 5 seconds...");
			setTimeout(function() {
				handleDisconnect(true);
			}, 5000);
		}
	} else if (!connected && reconn) {
		console.log("Attempting to reconnect...");
		cfg.seeds.length.forEach(function(peer) {
			node.addPeer(peer.address, peer.port);
		});
		setTimeout(function() {
			handleDisconnect(true);
		}, 5000);
	}
}

node.on("connect", function() {
	console.log("Connected to network!");
	connected = true;
});

node.on("disconnect", function() {
	handleDisconnect(false);
});

node.start();
