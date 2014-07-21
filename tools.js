var request = require("request");
var os = require("os");

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
		} else {
			console.log(err);
			throw "Unable to determine external IP";
		}
	});
}

module.exports.ipList = ipList;
