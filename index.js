#!/usr/bin/env node
var version = 3;

console.log("Octo-Node v" + version + " starting...");

console.log("Acquiring assets...");

var cfg = require("./config");
cfg.version = version;
var tools = require("./tools");
var uuid = require("node-uuid");
var os = require("os");
var dgram = require("dgram");

var s = dgram.createSocket("udp4");

console.log("Drawing plans...");

var evemitter = require("events").EventEmitter;
var ev = new evemitter;

var peers = [];
var messages = [];

if (process.argv[2]) {
	cfg.peers.initial.push(process.argv[2]);
}

console.log("Building tools...");

s.bind(cfg.server.port, cfg.server.host, function() {

	console.log("Writing letters...");
	
	cfg.peers.initial.forEach(function(v) {
		peers.push({
			ip: v,
			client: false,
			ping: true
		});
	});
	
	console.log("Sending letters...");
	
	peers.forEach(function(v) {
		ev.emit("peer", v.ip);
		tools.registerPeer(v.ip, cfg, s);
	});
	
	console.log("Taking over world with " + peers.length + " friend(s)...");
});

var commands = {};

commands.register = function(args, rinfo) {
	if (args[1] != version) {
		tools.sendToPeer(rinfo.address, cfg, s, {
			"octo-node": "hello",
			"cmd": "err",
			"args": ["Wrong version"]
		});
		return;
	}
	var found = false;
	peers.forEach(function(v) {
		if (v.ip == rinfo.address) {
			found = true;
		}
	});
	
	if (!found) {
		if (peers.length >= cfg.peers.max) {
			tools.sendToPeer(rinfo.address, cfg, s, {
				"octo-node": "hello",
				"cmd": "err",
				"args": ["Max peers reached"]
			});
			return;
		}
		
		peers.push({
			ip: rinfo.address,
			client: args[0] == "client",
			ping: true
		});
		
		console.log("Registered " + rinfo.address);
		ev.emit("peer", rinfo.address);
		console.log("Taking over world with " + peers.length + " friend(s)...");
	}
};

commands.ping = function(args, rinfo) {
	peers.forEach(function(v) {
		if (v.ip == rinfo.address) {
			tools.sendToPeer(rinfo.address, cfg, s, {
				"octo-node": "hello",
				"cmd": "pong",
				"args": []
			});
		}
	});
}

commands.pong = function(args, rinfo) {
	peers.forEach(function(v) {
		if (v.ip == rinfo.address) {
			v.ping = true;
		}
	});
}

commands.getpeerlist = function(args, rinfo) {
	var newpeers = [];
	peers.forEach(function(v) {
		if (rinfo.address != v.ip && (!v.client)) {
			newpeers.push(v);
		}
	});
	
	tools.sendToPeer(rinfo.address, cfg, s, {
		"octo-node": "hello",
		"cmd": "peerlist",
		"args": [newpeers]
	});
};

commands.peerlist = function(args, rinfo) {
	if (args[0]) {
		args[0].forEach(function(np) {
			var found = false;
			peers.forEach(function(p) {
				if (p.ip == np.ip) {
					found = true;
				}
			});
			
			if (!found) {
				if (peers.length < cfg.peers.max) {
					peers.push({
						ip: np.ip,
						client: false,
						ping: true
					});
					
					tools.registerPeer(np.ip, cfg, s);
					console.log("Registered " + np.ip);
					console.log("Taking over world with " + peers.length + " friend(s)...");
				}
			}
		});
	}
}

commands.err = function(args, rinfo) {
	console.log("Error from " + rinfo.address + ": " + args[0]);
};

commands.spreadmessage = function(args, rinfo) {
	if (args[0] && args[1]) {
	
		var found = false;
		
		messages.forEach(function(v) {
			if (v.id == args[0]) {
				found = true;
			}
		});
		
		if (!found) {
			console.log(args[1]);
			messages.push({
				id: args[0],
				msg: args[1]
			});
			
			peers.forEach(function(v) {
				tools.sendToPeer(v.ip, cfg, s, {
					"octo-node": "hello",
					"cmd": "spreadmessage",
					"args": [args[0], args[1]]
				});
			});
			
			ev.emit("message", args[1], args[0]);
		}
	}
}

s.on("message", function(buf, rinfo) {
	var msg = JSON.parse(buf.toString());
	if (msg) {
		if (msg["octo-node"] && msg["cmd"]) {
			if (commands[msg["cmd"]]) {
				commands[msg["cmd"]](msg["args"], rinfo);
			}
		}
	}
});

setInterval(function() {
	var newpeers = [];
	var disconn = false;
	
	peers.forEach(function(v) {
		if (v.ping) {
			newpeers.push(v);
			v.ping = false;
		} else {
			disconn = true;
			console.log(v.ip + " disconnected.");
		}
	});
	
	peers = newpeers;
	
	if (disconn) {
		console.log("Taking over world with " + peers.length + " friend(s)...");
	}
	
	peers.forEach(function(v) {
		tools.sendToPeer(v.ip, cfg, s, {
			"octo-node": "hello",
			"cmd": "ping",
			"args": []
		});
	});
	
}, 1000 * 15);

setInterval(function() {
	peers.forEach(function(v) {
		tools.sendToPeer(v.ip, cfg, s, {
			"octo-node": "hello",
			"cmd": "getpeerlist",
			"args": []
		});
	});
}, 1000 * 60);

module.exports = ev;

module.exports.sendMessage = function(msg) {
	var id = uuid();
	peers.forEach(function(v) {
		tools.sendToPeer(v.ip, cfg, s, {
			"octo-node": "hello",
			"cmd": "spreadmessage",
			"args": [id, msg]
		});
	});
};
