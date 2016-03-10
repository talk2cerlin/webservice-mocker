var http = require('http');
var app = require("../index.js");
var supertest = require('supertest');
var should = require('should');

var server = null;
var globalDone = null;

// Success tests



// Failure tests

var endExec = function(err, res){
    server.close();
    if(err)
        globalDone(err);
    else
        globalDone();

}

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
                body.should.have.propertyByPath('message', 'syscall').eql("open");
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
                body.should.have.propertyByPath('message', 'syscall').eql("open");
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