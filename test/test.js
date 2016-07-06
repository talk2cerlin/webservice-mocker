var http = require('http');
var app = require("../index.js");
var supertest = require('supertest');
var should = require('should');

app.enableLogs();
app.enableCors();

var server = null;
var globalDone = null;

var endExec = function(err, res){
    server.close();
    app.disableCors();
    app.disableLogs();
    if(err)
        globalDone(err);
    else
        globalDone();

}

// Failure tests

describe('GET / with wrong settings (routes and config files)', function(){

    // Test one
    // describe('GET / with wrong route file', function(){
    it('JSON route file not found error with status code 400', function(done){
        globalDone = done;
        // This route file doesnt exist
        var path = '.doesntexist.json';
        // Init server with wrong routes file
        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/')
            .expect(400)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.propertyByPath('message', 'errno').eql(-2);
                body.should.have.propertyByPath('message', 'path').eql(path);
                body.should.have.propertyByPath('message', 'code').eql("ENOENT");
                // Commenting this from test since its not supported by node version <=0.10
                // body.should.have.propertyByPath('message', 'syscall').eql("open");
            })
            .end(endExec);
    });
    // });

    // Test two
    // describe('GET / with correct route file and wrong config file', function(){
    it('JSON config file not found error with status code 400', function(done){
        globalDone = done;
        // This file exists but config file which is mentioned inside doesnt exists
        var path = './test/testroutes/wrongconfig.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/user')
            .expect(400)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.propertyByPath('message', 'errno').eql(-2);
                body.should.have.propertyByPath('message', 'path').eql("./test/testio/dummy.json");
                body.should.have.propertyByPath('message', 'code').eql("ENOENT");
                // Commenting this from test since its not supported by node version <=0.12
                // body.should.have.propertyByPath('message', 'syscall').eql("open");
            })
            .end(endExec);
    });
    // });

    it('Should return error in loading the routes file', function(done){
        globalDone = done;
        // This file exists but config file which is mentioned inside doesnt exists
        var path = './test/testroutes/invalid.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/user')
            .expect(400)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('message').be.a.String().equal('Error loading the routes file');
            })
            .end(endExec);
    });

    it('Should return error in loading the config file', function(done){
        globalDone = done;
        // This file exists but config file which is mentioned inside doesnt exists
        var path = './test/testroutes/test4.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/user')
            .expect(400)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('message').be.a.String().equal('Route found, but error loading in the corresponding config.');
            })
            .end(endExec);
    });

    it('Should throw route not found error since there is not definition for the given route', function(done){
        globalDone = done;

        var path = './test/testroutes/validroute.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/random')
            .expect('Content-Type', /json/)
            .expect(404)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('error').be.a.String().equal('Route not found');
            })
            .end(endExec);
    });
});



// Success tests


// Putting it in global as it will be used for more than one test
// Defined request object
var requestObject = {
    "headers" : {
        "content-type" : "application/json"
    }
};

// Defined response object
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


describe('Testing GET request', function(){
    describe('GET /api/v2/user', function(){

        it('Should return user object and message', function(done){
            globalDone = done;
            
            var path = './test/testroutes/validroute.json';

            server = http.createServer(function (req,res) {
                app.setRouteFile(path);
                app.handle(req,res);
            });

            server.listen(8000);

            supertest(server)
                .get('/api/v2/user')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('message').be.a.String().equal('User retrieved successfully');
                    body.should.have.propertyByPath('user', 'name').eql("cerlin");
                })
                .end(endExec);
        });
    });

    describe('GET /api/v2/links with dynamically registered route', function(){

        it('Should return links as array and message', function(done){
            globalDone = done;

            // Register your route
            app.get('/api/v2/links', requestObject, responseObject);

            server = http.createServer(function (req,res) {
                app.handle(req,res);
            });

            server.listen(8000);

            supertest(server)
                .get('/api/v2/links')
                .set('Content-Type', 'application/json')
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('links').be.a.Array().and.have.lengthOf(1);
                    body.should.have.property('message').be.a.String().equal('Links retrieved successfully');
                    // body.should.have.propertyByPath('user', 'name').eql("cerlin");
                })
                .end(endExec);
        });
    });

    describe('GET /api/v2/user/:id with dynamic id value', function(){

        it('Should return id variable in response payload', function(done){
            globalDone = done;

            var path = './test/testroutes/validroute.json';

            server = http.createServer(function (req,res) {
                app.handle(req,res);
                app.setRouteFile(path);
            });

            server.listen(8000);

            var id = Math.ceil(Math.random() * 100);

            supertest(server)
                .get('/api/v2/user/' + id)
                .set('Content-Type', 'application/vnd.api+json')
                .expect(200)
                .expect('Content-Type', "application/vnd.api+json")
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('name').be.a.String().eql("cerlin");
                    body.should.have.property('id').eql(id);
                })
                .end(endExec);
        });
    });
});

describe('Testing POST request', function(){
    describe('POST /api/v2/user', function(){

        it('Should return success flag and message', function(done){
            globalDone = done;
            
            var path = './test/testroutes/validroute.json';

            server = http.createServer(function (req,res) {
                app.setRouteFile(path);
                app.handle(req,res);
            });

            server.listen(8000);

            supertest(server)
                .post('/api/v2/user')
                .set('Content-Type', 'application/json')
                .send({"username" : "cerlin", "password": "cerlin"})
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('message').be.a.String().equal('Successfully logged in');
                    body.should.have.property('success', true);
                })
                .end(endExec);
        });
    });

    describe('POST /api/v2/links with dynamically registered route', function(){

        it('Should return links as array and message', function(done){
            globalDone = done;

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

            // Register your route
            app.post('/api/v2/links', postReqObj, postResObj);

            server = http.createServer(function (req,res) {
                app.handle(req,res);
            });

            server.listen(8000);

            supertest(server)
                .post('/api/v2/links')
                .set('Content-Type', 'application/json')
                .send({"name" : "cerlin"})
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('links').be.a.Array().and.have.lengthOf(1);
                    // body.should.have.propertyByPath('user', 'name').eql("cerlin");
                })
                .end(endExec);
        });
    });

    describe('POST /api/v2/user/:id/:name with dynamic id and name value', function(){

        it('Should return id and name in response payload', function(done){
            globalDone = done;

            var path = './test/testroutes/validroute.json';

            server = http.createServer(function (req,res) {
                app.handle(req,res);
                app.setRouteFile(path);
            });

            server.listen(8000);

            // Random generators which generates random ID and random Name
            var id = Math.ceil(Math.random() * 100);
            var name = (Math.random() + 1).toString(36).substring(10);

            supertest(server)
                .post('/api/v2/user/' + id + "/" + name)
                .set('Content-Type', 'application/vnd.api+json')
                .send({"fake" : "data"})
                .expect(200)
                .expect('Content-Type', "application/vnd.api+json")
                .expect(function(res){
                    var body = res.body;
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('name').be.a.String().eql(name);
                    body.should.have.property('id').eql(id);
                })
                .end(endExec);
        });
    });
});


describe('Testing header validation', function(){

    it('Should have error message for missing headers', function(done){
        globalDone = done;
        
        var path = './test/testroutes/validroute.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/user')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('message').be.a.String().equal('One or more header(s) are missing');
            })
            .end(endExec);
    });

    it('Should have error message for wrong header value', function(done){
        globalDone = done;
        
        var path = './test/testroutes/validroute.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/api/v2/user')
            .set('Content-Type', 'application/xml')
            .expect(400)
            .expect('Content-Type', /json/)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('message').be.a.String().equal('Header mismatch');
            })
            .end(endExec);
    });
});


describe('Testing default response', function(){

    it('Should recieve default response for Route not found', function(done){
        globalDone = done;
        
        var path = './test/testroutes/validroute.json';

        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/this/route/doesnt/exist')
            .expect(404)
            .expect('Content-Type', /json/)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('error').be.a.String().equal('Route not found');
            })
            .end(endExec);
    });

    it('Should recieve updated default response for Route not found', function(done){
        globalDone = done;
        
        var path = './test/testroutes/validroute.json';

        // Passing wrong response object just for code coverage

        var defaultRes = {
            "wrongHeadersKey" : {
                "content-type" : "application/json"
            },
            "statusCode" : 200,
            "wrongPayloadKey" : {
                "error" : "New response"
            }
        }

        app.setDefaultResponse(defaultRes);

        defaultRes = {
            "headers" : {
                "content-type" : "application/json"
            },
            "statusCode" : 200,
            "payload" : {
                "error" : "New response"
            }
        }

        app.setDefaultResponse(defaultRes);
        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .get('/this/route/doesnt/exist')
            .expect(defaultRes.statusCode)
            .expect('Content-Type', /json/)
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
                body.should.have.property('error').be.a.String().equal(defaultRes.payload.error);
            })
            .end(endExec);
    });
});


describe('Testing CORS', function(){
    it('Should recieve CORS headers', function(done){
        globalDone = done;
        
        var path = './test/testroutes/validroute.json';

        app.enableCors();
        server = http.createServer(function (req,res) {
            app.setRouteFile(path);
            app.handle(req,res);
        });

        server.listen(8000);

        supertest(server)
            .options('/api/v2/user')
            .expect(200)
            .expect('Access-Control-Allow-Origin', '*')
            .expect('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
            .expect(function(res){
                var body = res.body;
                body.should.be.an.instanceOf(Object);
            })
            .end(endExec);
    });
});