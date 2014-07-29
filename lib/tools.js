var request = require("request");
var os = require("os");
var msgpack = require("msgpack");
var zlib = require("zlib");

var ipCache = null;

function ipList(cb) {
	if (ipCache) {
		cb(ipCache);
		return;
	}
	var ips = [];
	function addIP(ip) {
		var found = false;
		ips.forEach(function(v) {
			if (v == ip) {
				found = true;
			}
		});
		if (!found) {
			ips.push(ip);
		}
	}
	request("http://curlmyip.com", function(err, res, body) {
		if (!err && res.statusCode == 200) {
			addIP(body.split("\n").join(""));
			var interfaces = os.networkInterfaces();
			for (var network in interfaces) {
				interfaces[network].forEach(function(v) {
					if (!v.internal && v.family == "IPv4") {
						addIP(v.address);
					}
				});
			}
			ipCache = ips;
			cb(ips);
			console.log("Using IPs: " + JSON.stringify(ips));
		} else {
			console.log(err);
			throw "Unable to determine external IP";
		}
	});
}

// in / out in bytes
var bandwidth = [0, 0];

function addDataUsage(buff, outbound) {
	if (outbound) {
		bandwidth[1] += buff.length;
	} else {
		bandwidth[0] += buff.length;
	}
}

function getDataUsage() {
	return bandwidth;
}

function pack(obj, cb) {
	zlib.gzip(msgpack.pack(obj), cb);
}

function unpack(buff, cb) {
	zlib.gunzip(buff, function(err, res) {
		if (err) {
			cb(err);
			return;
		}
		var obj = msgpack.unpack(res);
		cb(null, obj);
	});
}

module.exports.ipList = ipList;
module.exports.addDataUsage = addDataUsage;
module.exports.getDataUsage = getDataUsage;
module.exports.pack = pack;
module.exports.unpack = unpack;
