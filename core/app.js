var loader = require('../core/loader');
var url  = require('url');
var isEqual = require('lodash/isEqual');

var config = {
    "routePath" : "./routes/"
}

var parseJson = function(json){
    try{
        return JSON.parse(json);
    } catch(e) {
        return null;
    }
}

module.exports = function(){

    var request;
    var response;

    var responseDispatcher = function (data){
        if ( typeof data == "object" && data != null){
            // Check and set the headers.
            if ( typeof data['headers'] == "object" ){
                for(var header in data['headers']) {
                    response.setHeader(header, data['headers'][header]);
                }
            }
            // Set the status code
            if(typeof data['statusCode'] != "undefined"){
                response.statusCode = data['statusCode'];
            }
            //Send the payload as per the config file.
            if ( typeof data['payload'] == "object" ){
                return response.end(JSON.stringify(data['payload']));
            } else {
                // This will be unreachable code since data will always be set
                response.statusCode = 404;
                return response.end(JSON.stringify({"error" : "Route not found"}));
            }
        } else {
            // This will be unreachable code since data will always be set
            response.statusCode = 404;
            return response.end(JSON.stringify({"error" : "Route not found"}));
        }
    };

    var configValidator = function(config){
        if (typeof config == "string") {
            config = parseJson(config);
        }

        if(config == null){
            var error = {
                "headers" : {
                    "content-type" : "application/json"
                },
                "statusCode" : 400,
                "payload" : {
                    "message" : "Route found, but error loading in the corresponding config."
                }
            }
            return responseDispatcher(error);
        }

        var requestHeaders = request.headers;

        if ( typeof config['headers'] == "object" ){
            for(var header in config['headers']) {
                if(typeof requestHeaders[header] == "undefined")
                    return responseDispatcher(null);
            }
        }

        if(request.method == "POST" || request.method == "PUT"){
            if ( typeof config['request'] == "object" && config['request'] != null){
                if ( typeof config['request']['payload'] == "object" && config['request']['payload'] != null){
                    if(isEqual(request.postdata, config['request']['payload'])){
                        if ( typeof config['response'] == "object" && config['response'] != null){
                            return responseDispatcher(config['response']);
                        } else {
                            return responseDispatcher(null);
                        }
                    } else {
                        return responseDispatcher(null);
                    }
                } else {
                    return responseDispatcher(null);
                }
            } else {
                return responseDispatcher(null);
            }
        } else {
            if ( typeof config['response'] == "object" && config['response'] != null){
                return responseDispatcher(config['response']);
            } else {
                return responseDispatcher(null);
            }
        }

    }

    var failureHandler = function(err){
        console.log(err);
    }

    var app = {

        handle : function (req, res) {

            request = req;
            response = res;
            request.postdata = null;

            var body = "";

            request.on('data', function (data) {
                body += data;
                // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                if (body.length > 1e6) { 
                    // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                    request.connection.destroy();
                }
            });
            request.on('end', function () {
                request.postdata = parseJson(body);
                // Load the routes
                loader.load(config.routePath + "routes.json", appHandler, failureHandler);
            });


            var appHandler = function(route){
                if (typeof route != "object") {
                    route = parseJson(route);
                }

                if(route == null){
                    var error = {
                        "headers" : {
                            "content-type" : "application/json"
                        },
                        "statusCode" : 400,
                        "payload" : {
                            "message" : "Error loading the routes file"
                        }
                    }
                    return responseDispatcher(error);
                }

                if(typeof route[request.method + ":" + request.url] != "undefined"){
                    if(typeof route[request.method + ":" + request.url]['rule'] != "undefined"){
                        loader.load(route[request.method + ":" + request.url]['rule'], configValidator, failureHandler);
                    }
                } else {
                    responseDispatcher(null);
                }
            }
        },
        setRoutePath : function (path) {
            config.routePath = path;
        }
    }

    return app;
}