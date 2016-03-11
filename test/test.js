var http = require('http');
var app = require("../index.js");
var supertest = require('supertest');
var should = require('should');

var server = null;
var globalDone = null;

var endExec = function(err, res){
    server.close();
    if(err)
        globalDone(err);
    else
        globalDone();

}

// Success tests

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
                    // console.log(body);
                    body.should.be.an.instanceOf(Object);
                    body.should.have.property('message').be.a.String().equal('Successfully logged in');
                    body.should.have.property('success', true);
                })
                .end(endExec);
        });
    });
});

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
                // Commenting this from test since its not supported by node version <=0.12
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
});