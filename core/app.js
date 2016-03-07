var loader = require('../core/loader');
var url  = require('url');
var isEqual = require('lodash/isEqual');

var config = {
    "routeFile" : "./routes/routes.json"
}

var parseJson = function(json){
    try{
        return JSON.parse(json);
    } catch(e) {
        return null;
    }
}

var getError = function(message, statuscode){
    return {
        "headers" : {
            "content-type" : "application/json"
        },
        "statusCode" : statuscode,
        "payload" : {
            "message" : message
        }
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
            response.setHeader('Content-Type', "application/json");
            response.statusCode = 404;
            return response.end(JSON.stringify({"error" : "Route not found"}));
        }
    };

    var configValidator = function(config){
        if (typeof config == "string") {
            config = parseJson(config);
        }

        if(config == null){
            return responseDispatcher(getError("Route found, but error loading in the corresponding config.", 400));
        }

        var requestHeaders = request.headers;

        if ( typeof config['request'] == "object" ){
            if ( typeof config['request']['headers'] == "object" ){
                for(var header in config['request']['headers']) {
                    if(typeof requestHeaders[header] == "undefined"){

                        return responseDispatcher(getError("One or more header(s) are missing", 400));

                    } else if(requestHeaders[header].toLowerCase() != config['request']['headers'][header].toLowerCase()) {
                        
                        return responseDispatcher(getError("Header mismatch", 400));

                    }
                }
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
        return responseDispatcher(getError(err, 400));
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
                loader.load(config.routeFile, appHandler, failureHandler);
            });


            var appHandler = function(route){
                if (typeof route != "object") {
                    route = parseJson(route);
                }

                if(route == null){
                    return responseDispatcher(getError("Error loading the routes file", 400));
                }

                if(typeof route[request.method + ":" + request.url] != "undefined"){
                    if(typeof route[request.method + ":" + request.url]['rule'] != "undefined"){
                        loader.load(route[request.method + ":" + request.url]['rule'], configValidator, failureHandler);
                    } else {
                        return responseDispatcher(null);
                    }
                } else {
                    return responseDispatcher(null);
                }
            }
        },
        setRouteFile : function (path) {
            config.routeFile = path;
        }
    }

    return app;
}