var { Class } = require('sdk/core/heritage');
var { Unknown, Factory } = require('sdk/platform/xpcom');
var { Cc, Ci } = require('chrome');

var process = require('sdk/system/child_process');
var dir = require('sdk/system').pathFor('ProfD');

var HyperAppProtocol = Class({
	extends: Unknown,
	interfaces: ["nsIProtocolHandler"],
	scheme: "happ",
  	protocolFlags: Ci.nsIProtocolHandler.URI_NORELATIVE |
                 Ci.nsIProtocolHandler.URI_NOAUTH |
                 Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

	allowPort: function(port, scheme) {
		return true;
	},

	newURI: function(aSpec, aOriginCharset, aBaseURI) {
		var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
		uri.spec = aSpec;
		return uri;
	},

	newChannel: function(aURI) {
		console.log('path: ' + dir);
		console.log('aURI: ' + aURI.spec);

		var url = aURI.spec.slice(7);
		console.log('aURI: ' + url);

		var host;
		var port = 80;
		var path;
		var parts = url.split(":");
		if( parts.length == 1 ) {
			host = parts[0].split("/")[0];
			path = parts[0].slice(host.length);
		} else {
			host = parts[0];
			port = parts[1].split("/")[0];
			path = parts[1].slice(port.length);
		}
		console.log('host: ' + host);
		console.log('port: ' + port);
		console.log('path: ' + path);

		var thread = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager).currentThread;
		var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		var wait = true;

		var event = {
		  notify: function(timer) {
			console.log('timer!');
		    	wait = false;
		  }
		}

		process.exec('docker start ' + host, function (error, stdout, stderr) {
			if (error !== null) {
				console.log('stderr: ' + stderr);
				var exe = 'docker run --name ' + host + ' -v ' + dir + '/extensions/{3D4F08B3-FA9A-44D1-BE2A-A5EFF83FC0B4}/resources/happ/data:/usr/src/myapp -w /usr/src/myapp -d -p ' +  port + ':1337 node:0.12 node node.js';
				process.exec(exe, function (error, stdout, stderr) {
					if (error !== null) {
						console.log('stderr: ' + stderr);
					} 
					timer.initWithCallback(event, 300, Ci.nsITimer.TYPE_ONE_SHOT);			
				});
		   } else {
				timer.initWithCallback(event, 300, Ci.nsITimer.TYPE_ONE_SHOT);
			}			
		});

		while (wait) {
			console.log('waiting...');
			thread.processNextEvent(true);
	   }

		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var uri = ios.newURI("http://localhost:" + port + path, null, null);
		console.log('redirect: ' + uri.spec);
		var channel = ios.newChannelFromURI(uri, null);//.QueryInterface(Ci.nsIHttpChannel);
		return channel;
	}
});

var factory = Factory({
	contract: "@mozilla.org/network/protocol;1?name=happ",
  	Component: HyperAppProtocol
});


