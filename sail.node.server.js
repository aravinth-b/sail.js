// Super-simple stand-alone HTTP server with built-in reverse
// proxy for XMPP-BOSH.
//
// This uses node.js with the http-proxy and node-static modules.
//
// 

var http = require('http')
var httpProxy = require('http-proxy')
var httpStatic = require('node-static')
var url = require('url')
var util = require('util')

if (global.boshServer == undefined)
    global.boshServer = 'proto.encorelab.org'
if (global.boshPort == undefined)
    global.boshPort = 5280

var proxy = new httpProxy.HttpProxy()
var file = new(httpStatic.Server)('.', {cache: false})

var server = http.createServer(function (req, res) {
    if (url.parse(req.url).pathname.match(/^\/http-bind/)) {
        console.log("PROXY "+req.url)
        proxy.proxyRequest(req, res, {
            host: global.boshServer,
            port: global.boshPort
        })
    }
    
    req.addListener('end', function(){ 
        if (!url.parse(req.url).pathname.match(/^\/http-bind/)) {
            console.log("STATIC "+req.url)
            file.serve(req, res)
        }        
    })
})

server.start = function(port) {
    this.listen(port, function() {
        console.log("Starting... Sail server will listen on " + port + "...")
    })
}

exports.server = server

// Create a 'server.js' file at the root of your Sail app,
// and add this code:
//
// var sail = require('./js/sail.js/sail.node.server.js')
// sail.server.listen(8000)