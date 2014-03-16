function sendToPeer(ip, cfg, sock, msg) {
	var buf = new Buffer(JSON.stringify(msg));
	sock.send(buf, 0, buf.length, cfg.server.port, ip);
}

function registerPeer(ip, cfg, sock) {
	sendToPeer(ip, cfg, sock, {
		"p2pnode": "hello",
		"cmd": "register",
		"args": cfg.server.client ? ["client"] : []
	});
}

module.exports.registerPeer = registerPeer;
module.exports.sendToPeer = sendToPeer;
