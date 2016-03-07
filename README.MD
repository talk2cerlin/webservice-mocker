A simple api mocker which validates the request and respond based on a config file.

Webservice Mocker
======

To run this mocker

(1) Define your request and response as per the structure given below

    ```json
    {
        "request" : {
            "headers" : {
                "Content-Type" : "application/json"
            },
            "payload" : {
                "id": 1,
                "name" : "Cerlin"
            }
        },
        "response" : {
            "headers" : {
                "content-type" : "application/json"
            },
            "statusCode" : 201,
            "payload" : {
                "success" : true,
                "message" : "Successfully logged in"
            }
        }
    }
    ```

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Note: Not all http verbs uses payload variable]

(2) Define your routes as per the structure given below. Routes are the files which connects the request and the config. 

    ```json
    {
        "GET:/api/v2/user" : {
            "rule" : "./[path to file]/user.json"
        },
        "POST:/api/v2/user" : {
            "rule" : "./[path to file]/update.json"
        }
    }
    ```

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Note: The path should be relative from your app's root directory]

(3) Create a http server, require the mocker and call the handle method like,

    ```javascript
    var http = require('http');
    var mocker = require('webservice-mocker');

    var server = http.createServer(function (req,res) {
        // by default the routes will be searched in ./routes/routes.json
        // use mocker.setRouteFile('path to the routes file') to over load with a different file

        mocker.handle(req,res);
    });

    server.listen(8080);
    ```

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Note: If there is any error in loading the routes or config file, the response payload will have the error message.]

This Mocker exposes two methods

1. `mocker.handle(reques, response)`
    Method to handle the request. This method validates header and payload then return the response which is mentioned in routes.json

2. `mocker.setRouteFile('path to the routes file')`
    Method to force the app to read a different route file

#####TODO:

1. Support for file upload 
2. Support for regex based request payload.