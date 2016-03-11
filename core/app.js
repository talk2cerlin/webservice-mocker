var loader = require('../core/loader');
var isEqual = require('lodash/isEqual');
var isEmpty = require('lodash/isEmpty');


// Setting the default configuration
var config = {
    "routeFile" : "./routes/routes.json"
}

var registeredRoutes = {};

/**
 * Parses the json string
 *
 * @param {string} Json string which has to be parsed.
 * @return {null} or {object} returns null on parse error and object on parse success.
 */
var parseJson = function(json){
    try{
        return JSON.parse(json);
    } catch(e) {
        return null;
    }
}

/**
 * Populates the error object with the message and statuscode supplied
 *
 * @param {string} Message which has to be assigned inside object
 * @param {integer} server status code which has to be sent with response
 * @return {object} Final prepared object with message and status code
 */
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

// Exposing the method to outer world

module.exports = function(){

    /**
        Request object to save the incoming request. All methods inside this context can read and write data into this object.
    **/
    var request;

    /**
        Response object to save the outgoing response. All methods inside this context can read and write data into thi object.
    **/
    var response;

    /**
     * Method to dispatch the final response.
     *
     * @param {object} Data object which has header info, payload and status code
     * @return {object} Dispatched response object
     */
    var responseDispatcher = function (data){
        if ( typeof data === "object" && data !== null){
            // Check and set the headers.
            if ( typeof data['headers'] === "object" ){
                for(var header in data['headers']) {
                    response.setHeader(header, data['headers'][header]);
                }
            }
            // Set the status code
            if(typeof data['statusCode'] !== "undefined"){
                response.statusCode = data['statusCode'];
            }
            //Send the payload as per the config file.
            if ( typeof data['payload'] === "object" ){
                return response.end(JSON.stringify(data['payload']));
            } else {
                response.setHeader('Content-Type', "application/json");
                response.statusCode = 404;
                return response.end(JSON.stringify({"error" : "Route not found"}));
            }
        } else {
            // TODO: should send default response which is mentioned in routes.json file.
            response.setHeader('Content-Type', "application/json");
            response.statusCode = 404;
            return response.end(JSON.stringify({"error" : "Route not found"}));
        }
    };

    /**
     * Validate the input request header with the header info in config file.
     *
     * @param {object} Data object which has header info, payload and status code. Payload and status code will be passed to next payload validator.
     * @return {object} Dispatched response object
     */
    var headerValidator = function(config){
        if (typeof config === "string") {
            config = parseJson(config);
        }

        var errorMessage = null;

        if(config === null){
            errorMessage = "Route found, but error loading in the corresponding config.";
        } else {

            var requestHeaders = {};

            // Converting all the headers to lowercase.
            for(var reqheader in request.headers) {
                requestHeaders[reqheader.toLowerCase()] = request.headers[reqheader];
            }

            try{
                for(var header in config['request']['headers']) {

                    if(typeof requestHeaders[header.toLowerCase()] === "undefined"){

                        errorMessage = "One or more header(s) are missing";

                    } else if(requestHeaders[header.toLowerCase()].toLowerCase() !== config['request']['headers'][header].toLowerCase()) {
                        
                        errorMessage = "Header mismatch";

                    }
                }
            } catch(e) {
                errorMessage = "Schema error in config file";
            }
        }

        if(errorMessage !== null){
            return responseDispatcher(getError(errorMessage, 400));
        }

        return payloadValidator(request, config);
    }

    /**
     * Validate the input request payload with the payload in config file.
     *
     * @param {object} Data object which has header info, payload and status code.
     * @return {object} Dispatched response object
     */
    var payloadValidator = function(request, config){

        var resp = null;

        if(request.method === "POST" || request.method === "PUT"){

            try {
                if(isEqual(request.postdata, config['request']['payload'])){
                    if ( typeof config['response'] === "object" && config['response'] !== null){
                        resp = config['response'];
                    }
                }
            } catch (e) {
                resp = null;
            }
        } else {
            if ( typeof config['response'] === "object" && config['response'] !== null){
                resp = config['response'];
            } 
        }

        return responseDispatcher(resp);

    }

    /**
     * Handler which gets executed when the route files are loaded.
     *
     * @param {object} Route object passed by loader.
     * @return {object} Dispatched response object
     */
    var appHandler = function(route){

        // Check and parse if the parameter is string
        if (typeof route === "string") {
            route = parseJson(route);
        }

        // Append the registered routes with the loaded routes file.

        if(registeredRoutes !== null && typeof registeredRoutes === "object" && !isEmpty ( registeredRoutes )){

            // If route is null and registeredRoutes is not null, then donot throw error. Instead make route an object and merge that with registeredRoutes
            if ( route === null) {
                route = {};
            }

            for( var registeredRoute in registeredRoutes ) {
                route[registeredRoute] = registeredRoutes[registeredRoute];
            }
        }

        // Send error message if the route is not loaded properly. Route can be null if there is any syntax error in routes.json
        if(route === null){
            return responseDispatcher(getError("Error loading the routes file", 400));
        }

        // Cross validate the request with the routes.json and serve the response.
        if(typeof route[request.method + ":" + request.url] !== "undefined"){
            if(typeof route[request.method + ":" + request.url]['rule'] !== "undefined"){
                // Try to load the appropriate config file based on the route
                loader.load(route[request.method + ":" + request.url]['rule'], headerValidator, failureHandler);

            } else if(typeof route[request.method + ":" + request.url]['data'] !== "undefined") {

                return headerValidator(route[request.method + ":" + request.url]['data']);

            } else {
                return responseDispatcher(null);
            }
        } else {
            return responseDispatcher(null);
        }
    }

    /**
     * Handler which handles error in file loading.
     *
     * @param {string} Error string which explains why the failurehandler is called.
     * @return {object} Dispatched response object
     */
    var failureHandler = function(err){

        if ( isEmpty ( registeredRoutes ) ) {
            return responseDispatcher(getError(err, 400));
        } else {
            return appHandler(null);
        }
    }

    /**
     * Core object which is exposed to outside world. 
     *   This object has two public methods
     *      handle(request, response);
     *      setRouteFile(routes file full path);
     *
     */
    var app = {

        /**
         * Handler which handles the http request and responds
         *
         * @param {object} Request object from node http module.
         * @param {object} Response object from node http module
         * @return {object} Dispatched response object
         */
        handle : function (req, res) {

            // Exposing request and response to other methods
            request = req;
            response = res;

            request.postdata = null;

            var body = "";

            // Event handler to read and save the data when it arrives
            request.on('data', function (data) {
                body += data;
                // 1e6 ==== 1 * Math.pow(10, 6) ==== 1 * 1000000 ~~~ 1MB
                if (body.length > 1e6) { 
                    // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                    request.connection.destroy();
                }
            });

            // Event handler to parse the data since the data stream has ended
            request.on('end', function () {
                request.postdata = parseJson(body);
                // Load the routes
                loader.load(config.routeFile, appHandler, failureHandler);
            });
        },
        get : function (url, requestObject, responseObject) {

            return this.register("GET", url, requestObject, responseObject);
            
        },
        post : function (url, requestObject, responseObject) {

            return this.register("POST", url, requestObject, responseObject);

        },
        register : function (method, url, requestObject, responseObject) {

            try {
                var allowedRoutes = ['GET', 'POST', 'PUT'];
                if(allowedRoutes.indexOf(method.toUpperCase()) !== -1 ){

                    registeredRoutes[method.toUpperCase() + ":" + url] = {

                        "data" : {
                            "request" : requestObject,
                            "response" : responseObject
                        }

                    }

                }
            } finally {
                return this;
            }
        },

        /**
         * Method to set the route file location. Default location is ./routes/routes.json
         *
         * @param {string} Full path of the route file.
         * @return {void}
         */
        setRouteFile : function (path) {
            config.routeFile = path;
        }
    }

    return app;
}