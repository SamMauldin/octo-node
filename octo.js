#!/usr/bin/env node
var version = 5;

console.log("Octo-Node v" + version + " starting...");

console.log("Waking up...");

var cfg = require("./config");
cfg.version = version;
var tools = require("./tools");
var uuid = require("node-uuid");
var nodeid = uuid();
var os = require("os");
var dgram = require("dgram");
var ips = null;
var peers = [];

var s = dgram.createSocket("udp4");

function sendToIP(ip, msg) {
	msg.octo = true;
	msg.from = nodeid;
	msg.version = cfg.version;
	var buf = new Buffer(JSON.stringify(msg));
	s.send(buf, 0, buf.length, 42042, ip);
}

function sendToID(id, msg) {
	peers.forEach(function(v) {
		if (v.id == id) {
			sendToIP(v.ip, msg);
		}
	});
}

function registerPeer(addr) {
	sendToIP(addr, {
		cmd: "register",
		args: {
			ips: ips,
			from: nodeid
		}
	});
}

function announcePeers(peer) {
	if (peer) {
		console.log(peer + " joined : " + peers.length + " total peers");
	} else {
		console.log("Taking over the world with " + peers.length + " friend(s)");
	}
}

function start() {
	console.log("Planning...");
	s.bind(42042, "0.0.0.0", function() {
		console.log("Writing letters...");
		cfg.seeds.forEach(function(v) {
			registerPeer(v);
		});
		console.log("Letters mailed to " + cfg.seeds.length + " friend(s)");
		console.log("Now accepting incoming connections");
	});
}

tools.ipList(function(iplist) {
	ips = iplist;
	start();
});

var commands = {};

commands.ping = function(args, peer) {
	sendToID(peer.id, {
		cmd: "pong"
	});
};

commands.pong = function(args, peer) {
	peer.ping = true;
};

commands.register = function(args, rinfo) {
	if (args.ips && args.from) {
		if (peers.length >= cfg.maxPeers) { return; }
		peers.push({
			ping: true,
			ip: rinfo.address,
			ips: args.ips,
			id: args.from
		});
		registerPeer(rinfo.address);
		announcePeers(args.from);
	}
};

s.on("message", function(buf, rinfo) {
	var msg = JSON.parse(buf.toString());
	if (msg) {
		if (msg["octo"] && msg["cmd"] && msg["from"] && msg["version"]) {
			if (commands[msg["cmd"]] && msg["version"] == cfg.version) {
				if (msg["cmd"] != "register") {
					peers.forEach(function(v) {
						if (v.ip == rinfo.address && v.id == msg["from"]) {
							commands[msg["cmd"]](msg["args"], v);
						}
					});
				} else {
					var exit = false;
					peers.forEach(function(v) {
						if (v.ip == rinfo.address) {
							exit = true;
						}
					});
					if (exit) { return; }
					commands.register(msg["args"], rinfo);
				}
			}
		}
	}
});

setInterval(function() {
	var newPeers = [];
	peers.forEach(function(peer) {
		if (peer.ping) {
			peer.ping = false;
			sendToID(peer.id, {
				cmd: "ping"
			});
			newPeers.push(peer);
		}
		if (peers.length != newPeers.length) {
			announcePeers();
		}
		peers = newPeers;
	});
}, 1000 * 15);
