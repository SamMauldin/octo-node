Octo-Node
=========
Octo-Node is a P2P networking library written in node.js

Download
========
In a terminal:

	git clone https://github.com/Sxw1212/octo-node.git
	npm install # C++ compiler required!
	cp example-config.json config.json

Use your favorite to edit config.json.

	maxPeers: The maximum amount of peers your node will connect to
	seeds: An array of initial nodes to connect to
	leech: If true, your node will not connect to any other nodes by itself
	debug: If true, your console will be spammed with random text

Setup
=====
Depending on your router, you may not need to port forward.
To find out, run `node index.js` and see if it connects to the default server.
If it does, your node will be able to connect, but probably not receive connections.
If not, you will need to port forward

Running multiple nodes under one external IP
============================================
You can run multiple nodes under one IP, but you will need to use a different port on each node. There are also some quirks when nodes are run with this.
