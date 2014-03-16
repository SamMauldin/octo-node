#!/usr/bin/env node
console.log("P2PNode starting...");

console.log("Acquiring assets...");

var cfg = require("./config");
var tools = require("./tools");
var dgram = require("dgram");

var s = dgram.createSocket("udp4");

console.log("Drawing plans...");

var peers = [];

if (process.argv[2]) {
	cfg.peers.initial.push(process.argv[2]);
}

console.log("Building tools...");

s.bind(cfg.server.port, cfg.server.host, function() {

	console.log("Writing letters...");
	
	cfg.peers.initial.forEach(function(v) {
		peers.push({
			ip: v
		});
	});
	
	console.log("Sending letters...");
	
	peers.forEach(function(v) {
		tools.registerPeer(v.ip, cfg.server.port, s);
	});
	
	console.log("Taking over world with " + peers.length + " friend(s)...");
});

var commands = {};

commands.register = function(args, rinfo) {
	var found = false;
	peers.forEach(function(v) {
		if (v.ip == rinfo.address) {
			found = true;
		}
	});
	
	if (!found) {
		if (peers.length >= cfg.peers.max) {
			tools.sendToPeer(rinfo.address, cfg.server.port, s, {
				"p2pnode": "hello",
				"cmd": "err",
				"args": ["Max peers reached"]
			});
			return;
		}
		
		peers.push({
			ip: rinfo.address,
			ping: true
		});
		
		console.log("Taking over world with " + peers.length + " friend(s)...");
	}
};

commands.ping = function(args, rinfo) {
	peers.forEach(function(v) {
		if (v.ip == rinfo.address) {
			tools.sendToPeer(rinfo.address, cfg.server.port, s, {
				"p2pnode": "hello",
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

commands.err = function(args, rinfo) {
	console.log("Error from " + rinfo.address + ": " + args[0]);
};

s.on("message", function(buf, rinfo) {
	var msg = JSON.parse(buf.toString());
	if (msg) {
		if (msg["p2pnode"] && msg["cmd"]) {
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
	
	console.log("Taking over world with " + peers.length + " friend(s)...");
	
	peers.forEach(function(v) {
		tools.sendToPeer(v.ip, cfg.server.port, s, {
			"p2pnode": "hello",
			"cmd": "ping",
			"args": []
		});
	});
	
}, 1000 * 15);
