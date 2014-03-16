console.log("P2PNode starting...");

console.log("Acquiring assets...");

var cfg = require("./config");
var tools = require("./tools");
var dgram = require("dgram");

var s = dgram.createSocket("udp4");

console.log("Drawing plans...");

var peers = [];

console.log("Building tools...");

s.bind(cfg.server.port, function() {

	console.log("Writing letters...");
	
	cfg.peers.initial.forEach(function(v) {
		s.addMembership(v);
		peers.push(v);
	});
	
	console.log("Sending letters...");
	
	peers.forEach(function(v) {
		tools.registerPeer(v, cfg.server.port, s);
	});
	
	console.log("Taking over world...");
});

var commands = {};

commands.register = function(args, rinfo) {
	console.log(rinfo);
};

s.on("message", function(buf, rinfo) {
	var msg = JSON.parse(buf.toString());
	if (msg) {
		if (msg["p2pnode"] && msg["cmd"]) {
			if (commands[msg["cmd"]]) {
				commands[msg["cmd"]](msg["args"]);
			}
		}
	}
});
