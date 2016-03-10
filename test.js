var http = require('http');
var app = require("./index.js");


var server = http.createServer(function (req,res) {
    app.handle(req,res);
});

server.listen(8080);