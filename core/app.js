var loader = require('../core/loader');
var isEqual = require('lodash/isEqual');
var isEmpty = require('lodash/isEmpty');
var prettyJson = require('prettyjson');
var colors = require('colors/safe');

/**
 * Default configuration for the mocker
**/
var config = {
    "routeFile" : "./routes/routes.json",
    "cors" : false,
    "logs" : false
}
 
/**
 * Options for prettyJson
**/
var options = {
    keysColor: 'blue',
    dashColor: 'white',
    stringColor: 'green',
    numberColor: 'cyan'
};
 
/**
 * Setting default theme for colors plugin.
**/
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

/**
 * Routes which are registered on the fly using get, post and register methods.
**/
var registeredRoutes = {};

    
var tokenVars = {};

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

/**
 * Custom logger which logs data in console.
 * Also does data preparation before loggin.
**/
var log = {

    json: function(data){
        (config.logs) ? console.log("{\n" + prettyJson.render(data, options, 4) + "\n}") : "";
    },

    info: function(message){
        (config.logs) ? console.log(colors.info(message)) : "";
    },

    error: function(message){
        (config.logs) ? console.log(colors.error(message)) : "";
    },

    warn: function(message){
        (config.logs) ? console.log(colors.warn(message)) : "";
    },

    silly: function(message){
        (config.logs) ? console.log(colors.silly(message)) : "";
    },

    newLine: function(){
        console.log("\n");
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

                data = JSON.stringify(data);

                for (var token in tokenVars) {
                    data = data.replace( ":" + token, tokenVars[token]);
                }

                data = parseJson(data);

                log.info('Request is served with: ');
                log.json(data);
                log.silly("*************************************************************************************");

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

                log.info('Requested payload is: ');
                log.json(request.postdata);

                if(isEqual(request.postdata, config['request']['payload'])){
                    if ( typeof config['response'] === "object" && config['response'] !== null){
                        resp = config['response'];
                    }
                } else {
                    resp = getError("Payload is not matching.", 400);
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
     * Method to validate the url with registered routes.
     *
     * @param {string} Route URL to validate.
     * @param {string} Request URL from client to validate.
     * @return {object} Dispatched response object
     */
    var isValid = function(RouteURL, RequestURL){

        var flag = true;

        RouteURL = RouteURL.toLowerCase();
        RequestURL = RequestURL.toLowerCase();

        RouteURL = RouteURL.split('/');
        RequestURL = RequestURL.split('/');

        // Remove empty values
        RequestURL = RequestURL.filter(Boolean);

        // Throw error, If http verb doesnt match or request url segment count and route url segment count doesnt match
        if ((RouteURL.shift() !== RequestURL.shift()) || RouteURL.length !== RequestURL.length)
            flag = false;

        if (flag) {

            for (var index in RouteURL) {

                if(RouteURL[index] && RouteURL[index].indexOf(':') !== -1) {

                    try {
                        if (RequestURL[index]) {
                            tokenVars[RouteURL[index].substr(1)] = RequestURL[index];
                        } else {

                            // Reset the token
                            tokenVars = {};
                            flag = false;
                        }
                    } catch (exception) {
                        flag = false;
                    }

                } else if(RouteURL[index] !== RequestURL[index]) {
                    
                    flag = false;
                    
                }
            }
        }

        return flag;
    }

    /**
     * Handler which gets executed when the route files are loaded.
     *
     * @param {object} Route object passed by loader.
     * @return {object} Dispatched response object
     */
    var appHandler = function(route){

        // Empty the global tokens
        tokenVars = {};

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

        // log the requested json
        log.info("Registered routes are : ");
        log.json(route);

        // Send error message if the route is not loaded properly. Route can be null if there is any syntax error in routes.json
        if(route === null){
            return responseDispatcher(getError("Error loading the routes file", 400));
        }


        log.info("Requested route is - " + request.method + ":" + request.url);

        // Cross validate the request with the routes.json and serve the response.
        if(typeof route[request.method + ":" + request.url] !== "undefined"){

            return routeIt(route, request.method + ":" + request.url);

        } else {

            var routeKeys = Object.keys(route);

            for (var singleRoute in routeKeys) {

                if (isValid(routeKeys[singleRoute], request.method + ":" + request.url)) {

                    return routeIt(route, routeKeys[singleRoute]);

                }
            }

            return responseDispatcher(null);
        }
    }

    /**
     * This method finds the route definition and responds
     *
     * @param {object} Route object passed by app handler.
     * @param {string} URL key.
     * @return {object} Dispatched response object
     **/
    var routeIt = function(route, key){
        if(typeof route[key]['rule'] !== "undefined"){

            log.info("Config file found for route - " + request.method + ":" + request.url);
            // Try to load the appropriate config file based on the route
            loader.load(route[key]['rule'], headerValidator, failureHandler);

        } else if(typeof route[key]['data'] !== "undefined") {

            log.info("Route definition found for route - " + request.method + ":" + request.url);
            return headerValidator(route[key]['data']);

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

            log.info('Request received.. ');

            // Exposing request and response to other methods
            request = req;
            response = res;

            // Check if cors is enabled for the user.
            if(config.cors){
                response.setHeader('Access-Control-Allow-Origin', "*");
                response.setHeader('Access-Control-Allow-Methods', "GET, POST, PUT, DELETE");
                response.setHeader('Access-Control-Allow-Headers', "Accept, Accept-CH, Accept-Charset, Accept-Datetime, Accept-Encoding, Accept-Ext, Accept-Features, Accept-Language, Accept-Params, Accept-Ranges, Access-Control-Allow-Credentials, Access-Control-Allow-Headers, Access-Control-Allow-Methods, Access-Control-Allow-Origin, Access-Control-Expose-Headers, Access-Control-Max-Age, Access-Control-Request-Headers, Access-Control-Request-Method, Age, Allow, Alternates, Authentication-Info, Authorization, C-Ext, C-Man, C-Opt, C-PEP, C-PEP-Info, CONNECT, Cache-Control, Compliance, Connection, Content-Base, Content-Disposition, Content-Encoding, Content-ID, Content-Language, Content-Length, Content-Location, Content-MD5, Content-Range, Content-Script-Type, Content-Security-Policy, Content-Style-Type, Content-Transfer-Encoding, Content-Type, Content-Version, Cookie, Cost, DAV, DELETE, DNT, DPR, Date, Default-Style, Delta-Base, Depth, Derived-From, Destination, Differential-ID, Digest, ETag, Expect, Expires, Ext, From, GET, GetProfile, HEAD, HTTP-date, Host, IM, If, If-Match, If-Modified-Since, If-None-Match, If-Range, If-Unmodified-Since, Keep-Alive, Label, Last-Event-ID, Last-Modified, Link, Location, Lock-Token, MIME-Version, Man, Max-Forwards, Media-Range, Message-ID, Meter, Negotiate, Non-Compliance, OPTION, OPTIONS, OWS, Opt, Optional, Ordering-Type, Origin, Overwrite, P3P, PEP, PICS-Label, POST, PUT, Pep-Info, Permanent, Position, Pragma, ProfileObject, Protocol, Protocol-Query, Protocol-Request, Proxy-Authenticate, Proxy-Authentication-Info, Proxy-Authorization, Proxy-Features, Proxy-Instruction, Public, RWS, Range, Referer, Refresh, Resolution-Hint, Resolver-Location, Retry-After, Safe, Sec-Websocket-Extensions, Sec-Websocket-Key, Sec-Websocket-Origin, Sec-Websocket-Protocol, Sec-Websocket-Version, Security-Scheme, Server, Set-Cookie, Set-Cookie2, SetProfile, SoapAction, Status, Status-URI, Strict-Transport-Security, SubOK, Subst, Surrogate-Capability, Surrogate-Control, TCN, TE, TRACE, Timeout, Title, Trailer, Transfer-Encoding, UA-Color, UA-Media, UA-Pixels, UA-Resolution, UA-Windowpixels, URI, Upgrade, User-Agent, Variant-Vary, Vary, Version, Via, Viewport-Width, WWW-Authenticate, Want-Digest, Warning, Width, X-Content-Duration, X-Content-Security-Policy, X-Content-Type-Options, X-CustomHeader, X-DNSPrefetch-Control, X-Forwarded-For, X-Forwarded-Port, X-Forwarded-Proto, X-Frame-Options, X-Modified, X-OTHER, X-PING, X-PINGOTHER, X-Powered-By, X-Requested-With, " + Object.keys(request.headers).join(', '));
                if(request.method == "OPTIONS") {
                    log.info('CORS request detected.');
                    return response.end();
                }
            }

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
                log.info("Route \"" + method.toUpperCase() + ":" + url + "\"" + "is registered.");
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
            log.info("Route file is pointed to " + path);
        },

        /**
         * Method to enable cross domain resource sharing.
         *
         * @return {void}
         */
        enableCors : function () {
            config.cors = true;
            log.info("Cross Domain Request Sharing is enabled.");
        },

        /**
         * Method to disable cross domain resource sharing.
         *
         * @return {void}
         */
        disableCors : function () {
            config.cors = false;
            log.info("Cross Domain Request Sharing is disabled.");
        },

        /**
         * Method to enable logs to be printed in console.
         *
         * @return {void}
         */
        enableLogs : function () {
            config.logs = true;
            log.info("Logs are enabled.");
        },

        /**
         * Method to disable logs to be printed in console.
         *
         * @return {void}
         */
        disableLogs : function () {
            config.logs = false;
            log.info("Logs are disabled.");
        }
    }

    return app;
}