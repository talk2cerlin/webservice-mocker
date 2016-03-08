var fs = require('fs');

var check = function(callback){
    return (typeof callback === 'function') ? callback : function() {};
};

var loader = {
    // Using async file read instead of sync
    load : function(path, successCB, errCB){
        fs.readFile(path, handleFile);
        // Callback to fire once the file is read.
        function handleFile(err, data) {

            if (err) return errCB(err);
            try {
                obj = JSON.parse(data);
            } catch (e) {
                obj = null;
            }

            // You can now play with your data
            return check(successCB).apply(this, [obj]);
        }
    },

    loadSync : function(path){
        return fs.readFileSync(path);
    }
}

module.exports = loader;