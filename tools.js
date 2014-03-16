function sendToPeer(ip, port, sock, msg) {
	var buf = new Buffer(JSON.stringify(msg));
	sock.c.send(buf, 0, buf.length, port, ip);
}

function registerPeer(ip, port, sock) {
	sendToPeer(ip, port, sock, {
		"p2pnode": "hello",
		"cmd": "register",
		"args": []
	});
}

module.exports.registerPeer = registerPeer;
module.exports.sendToPeer = sendToPeer;
