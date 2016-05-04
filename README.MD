Webservice Mocker
======

![Build](https://api.travis-ci.org/talk2cerlin/webservice-mocker.svg)
![Version](https://img.shields.io/npm/v/webservice-mocker.svg)
![Downloads](https://img.shields.io/npm/dm/webservice-mocker.svg)
![Total Downloads](https://img.shields.io/npm/dt/webservice-mocker.svg)
![Dependencies](https://david-dm.org/talk2cerlin/webservice-mocker.svg)
![devDependencies](https://david-dm.org/talk2cerlin/webservice-mocker/dev-status.svg)

A simple api mocker which validates the request and respond based on a config file.

[![NPM](https://nodei.co/npm/webservice-mocker.png?mini=true)](https://nodei.co/npm/webservice-mocker/)

#####Whats new?

Usage of variables in Route URL and response payload

To run

(1) Define your request and response as per the structure given below [example: login.json]

    {
        "request" : {
            "headers" : {
                "Content-Type" : "application/json"
            },
            "payload" : {
                "username": "Cerlin",
                "password" : "random"
            }
        },
        "response" : {
            "headers" : {
                "Content-Type" : "application/json"
            },
            "statusCode" : 201,
            "payload" : {
                "success" : true,
                "message" : "Successfully logged in"
            }
        }
    }

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Note: Not all http verbs uses payload variable]

(2) Define your routes as per the structure given below. Routes are the files which connects the request and the config. 

    {
        "GET:/api/v2/user" : {
            "rule" : "./[path to file]/user.json"
        },
        "POST:/api/v2/user" : {
            "rule" : "./[path to file]/login.json"
        },
        "GET:/api/v2/posts" : {
            "data" : {
                "request" : {
                    "headers" : {
                        "content-type" : "application/json"
                    }
                },
                "response" : {
                    "headers" : {
                        "content-type" : "application/json"
                    },
                    "statusCode" : 200,
                    "payload" : {
                        "posts" : [
                            {
                                "name" : "Post 1"
                            },
                            {
                                "name" : "Post 2"
                            }
                        ],
                        "message" : "Posts retrieved successfully"
                    }
                }
            }
        },
        "POST:/api/v2/user/:id/:name" : {
            "data" : {
                "request" : {
                    "headers" : {
                        "Content-Type" : "application/vnd.api+json"
                    },
                    "payload" : {
                        "fake" : "data"
                    }
                },
                "response" : {
                    "headers" : {
                        "Content-Type" : "application/vnd.api+json"
                    },
                    "statusCode" : 200,
                    "payload" : {
                        "name" : ":name",
                        "id" : ":id"
                    }
                }
            }
        }
    }

[Note: The path should be relative from your app's root directory]
[Note: You can have inline request/response definition as well]
[Note: Now you can use variables in URL. Ofcourse the variables can be used in RESPONSE payload]

(3) Create a http server, require the mocker and call the handle method like,

    var http = require('http');
    var mocker = require('webservice-mocker');

    var server = http.createServer(function (req,res) {
        // by default the routes will be searched in ./routes/routes.json
        // use mocker.setRouteFile('path to the routes file') to over load with a different file

        mocker.handle(req,res);
    });

    server.listen(8080);

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Note: If there is any error in loading the routes or config file, the response payload will have the error message.]

After putting files in place, your project will look something similar to the below image. (ofcourse you can have custom folder name and file name)

![Imgur](http://i.imgur.com/2zFw3WO.png)

or simply register your routes using get or post methods [Available from v0.4.0] like metioned below

    var http = require('http');
    var mocker = require("webservice-mocker");
    mocker.enableLogs(); // Should be the first method, so that all the actions will be logged.


    var requestObject = {
        "headers" : {
            "content-type" : "application/json"
        }
    };

    var responseObject = {
        "headers" : {
            "content-type" : "application/json"
        },
        "statusCode" : 200,
        "payload" : {
            "links" : [
                {
                    "name" : "Link 1"
                }
            ],
            "message" : "Links retrieved successfully"
        }
    };

    var postReqObj = {};
    postReqObj['headers'] = requestObject['headers'];
    postReqObj['payload'] = {
        "name" : "cerlin"
    }
    var postResObj = {};
    postResObj['headers'] = responseObject['headers'];
    postResObj['payload'] = {
        "links" : [{
            "name" : "cerlin"
        }]
    }

    var getReqObj = {};
    getReqObj['headers'] = requestObject['headers'];

    var getNewResObj = {}; 
    getNewResObj['headers'] = responseObject['headers'];
    getNewResObj['payload'] = {
        "links" : [{
            "name" : "cerlin",
            "id" : ":id"
        }]
    }

    mocker
        .get('/api/v2/links', requestObject, responseObject)
        .post('/api/v2/links', postReqObj, postResObj)
        .get('/api/v2/user/:id', getReqObj, getNewResObj);

    var server = http.createServer(function (req,res) {

        // use mocker.enableCors() to enable Cross Domain Request Sharing.
        // If CORS is enabled, the server will respond for requests with OPTIONS as method.
        mocker.handle(req,res);

    });

    server.listen(8080);


This Mocker exposes five methods

1. `mocker.handle(request, response)`. 
    Method to handle the request. This method validates header and payload then return the response which is mentioned in routes.json

2. `mocker.setRouteFile('path to the routes file')`. 
    Method to force the app to read a different route file

3. `mocker.get(url, requestObj, responseObj)`. 
    This method registers your GET request over the rules in routes file. (ie, if routes file is present then this rule will be appended with that else this rule standalone). This method can be used if you dont want to create any routes file and rules/config files. This method should be called before `handle` method
    [Please refer the example above for request/response structure]

4. `mocker.post(url, requestObj, responseObj)`. 
    This method registers your POST request over the rules in routes file. (ie, if routes file is present then this rule will be appended with that else this rule standalone). This method can be used if you dont want to create any routes file and rules/config files. This method should be called before `handle` method
    [Please refer the example above for request/response structure]

5. `mocker.register(method, url, requestObj, responseObj)`. 
    This method can be used to register GET or POST or PUT. Previous two methods will call this method internally. 
    [Please refer the example above for request/response structure]

6. `mocker.enableCors()`.
    This method is to enable Cross Domain Request Sharing . [Available from v0.5.0]

7. `mocker.disableCors()`.
    This method is to disable Cross Domain Request Sharing . [Available from v0.5.0]

8. `mocker.enableLogs()`.
    This method is to enable logs to be written in console. [Available from v0.6.0]. This method should be called just after requiring all the packages.

9. `mocker.disableLogs()`.
    This method is to disable logs to be written in console. [Available from v0.6.0]

###Change Log:

####v0.7.0
1. Much awaited variables in URL and in Response payload.

####v0.6.1
1. Minor document update.

####v0.6.0
1. Added options to enable and disable logging info in console.

####v0.5.1
1. Minor patch in CORS feature.

####v0.5.0
1. Added options to enable and disable CORS.

####v0.4.1
1. Code cleanup and minor corrections in README.MD


####v0.4.0
1. Added support for putting data in routes file itself [Json file method is better for organising code for bigger mocking app.]
2. Added methods [get, post and register methods] for better rule registration on the fly.

#### Contribution Note

#####1.Pull requests has to be created for dev branch not master as master will have only released code.


[Feature poll](http://www.easypolls.net/poll.html?p=56e10972e4b07a2c07c17ed1)

#####TODO:

1. Default response should be configurable by the user.
2. ~~Variables in URL
3. ~~Logging all requests and response in console~~
4. Support for file upload 
5. Support for regex based request payload.
