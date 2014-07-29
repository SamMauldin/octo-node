#!/usr/bin/env node
var version = 22;
console.log("Octo-Node v" + version + " starting...");

var cfg = require("../config");
cfg.version = version;
var tools = require("./tools");
var uuid = require("node-uuid");
var nodeid = uuid();
var os = require("os");
var dgram = require("dgram");
var EventEmitter = require("events").EventEmitter;
var ev = new EventEmitter();
var ips = null;
var peers = [];

var s = dgram.createSocket("udp4");

console.log("Connecting to " + cfg.netname);

function debug(msg) {
	if (cfg.debug) {
		console.log(msg);
	}
}

function sendToIP(ip, port, msg) {
	msg.octo = true;
	msg.from = nodeid;
	msg.version = cfg.version;
	msg.netname = cfg.netname;
	msg.port = cfg.port;
	tools.pack(msg, function(err, res) {
		if (err) {
			console.log(err);
			return;
		}
		tools.addDataUsage(res, true);
		s.send(res, 0, res.length, port, ip);
	});
}

function sendToID(id, msg) {
	var found = false;
	peers.forEach(function(v) {
		if (v.id == id) {
			sendToIP(v.ip, v.port, msg);
			found = true;
		}
	});
	if (!found) {
		debug("Failed to send message to " + id);
		debug(msg);
	}
}

function registerPeer(addr, port, id) {
	sendToIP(addr, port {
		cmd: "register",
		args: {
			ips: ips,
			from: nodeid,
			leech: cfg.leech,
			port: cfg.port
		},
		to: id
	});
}

function announcePeers(peer) {
	if (peer) {
		console.log(peer + " connected : " + peers.length + " total peer(s)");
	} else {
		console.log("Connected to " + peers.length + " peer(s)");
	}
}

function start() {
	s.bind(cfg.port, "0.0.0.0", function() {
		cfg.seeds.forEach(function(v) {
			registerPeer(v[0], v[1]);
		});
		console.log("Pinged " + cfg.seeds.length + " peers(s)");
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
	if (args.ips && args.from && args.port) {
		if (peers.length >= cfg.maxPeers) { return; }
		peers.push({
			ping: true,
			ip: rinfo.address,
			ips: args.ips,
			id: args.from,
			leech: args.leech,
			port: args.port
		});
		registerPeer(rinfo.address);
		announcePeers(args.from);
		ev.emit("peer", args.from);
	}
};

commands.peerlist = function(args, peer) {
	if (args.peers && !cfg.leech) {
		args.peers.forEach(function(v) {
			var found = false;
			peers.forEach(function(vpeer) {
				if (vpeer.id == v.id) {
					found = true;
				}
			});
			if (!found) {
				v.ips.forEach(function(vip) {
					registerPeer(vip, v.id);
				});
			}
		});
	}
};

var msgs = {};

commands.spreadmessage = function(args, peer) {
	if (args["msg"] && args["msgid"]) {
		if (!msgs[args["msgid"]]) {
			msgs[args["msgid"]] = true;
			ev.emit("message", args["msg"], args["msgid"], args["core"]);
			peers.forEach(function(v) {
				sendToID(v.id, {
					cmd: "spreadmessage",
					args: args
				});
			});
			if (!args["core"]) {
				console.log(args["msg"]);
			}
		}
	}
};

commands.getpeerlist = function(args, peer) {
	var sendpeers = [];
	peers.forEach(function(v) {
		if (!v.leech && v.id != peer.id) {
			sendpeers.push(v);
		}
	});
	sendToID(peer.id, {
		cmd: "peerlist",
		args: sendpeers
	});
};

s.on("message", function(buff, rinfo) {
	tools.addDataUsage(buff, false);
	tools.unpack(buff, function(err, msg) {
		if (err) {
			console.log(err);
			return;
		}
		if (msg) {
			if (msg["octo"] && msg["cmd"] && msg["from"] && msg["version"] && msg["netname"]) {
				if (commands[msg["cmd"]] && msg["version"] == cfg.version && msg["netname"] == cfg.netname) {
					if(msg["to"]) {
						if(msg["to"] != nodeid) {
							debug("Received message ment for someone else");
							return;
						}
					}
					if (msg["cmd"] != "register") {
						peers.forEach(function(v) {
							if (v.ip == rinfo.address && v.id == msg["from"] && v.port == msg["port"]) {
								commands[msg["cmd"]](msg["args"], v);
							}
						});
					} else {
						var exit = false;
						peers.forEach(function(v) {
							if (v.ip == rinfo.address && v.port == msg["port"]) {
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
});

setInterval(function() {
	var toRemove = [];
	peers.forEach(function(peer) {
		if (peer.ping) {
			peer.ping = false;
			sendToID(peer.id, {
				cmd: "ping"
			});
		} else {
			ev.emit("disconnect", peer.id);
			toRemove.push(peer.id);
		}
		if (toRemove.length > 0) {
			toRemove.forEach(function(id) {
				var newPeers = [];
				peers.forEach(function(peer) {
					if (peer.id != id) {
						newPeers.push(JSON.parse(JSON.stringify(peer)));
					}
				});
				peers = newPeers;
			});
			announcePeers();
		}
	});
}, 1000 * 5);

setInterval(function() {
	cfg.seeds.forEach(function(v) {
		registerPeer(v);
	});
}, 1000 * 10);

if (!cfg.leech) {
	setInterval(function() {
		peers.forEach(function(peer) {
			sendToID(peer.id, {
				cmd: "getpeerlist"
			});
		});
	}, 1000 * 60);
}

// API

function sendMessage(msg, core) {
	commands.spreadmessage({
		msg: msg,
		msgid: uuid(),
		core: core
	});
}

module.exports = ev;
module.exports.id = nodeid;
module.exports.ips = ips;
module.exports.sendMessage = sendMessage;
