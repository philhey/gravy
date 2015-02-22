
// allows for loading fo file either from the server (browser scripts) or the local file system (node.js)

if (typeof module !== 'undefined' && module.exports){ //Nodejs

    var G = global.G;

    var fs = require('fs');
    G.loadFile = function(fn, callback){
        fs.readFile(fn, function (err, data){
            if (err)
                throw err;
            callback(data);
        })
    };

    module.exports = G.loadFile;
}
else //CommonJS
{ //requires jQuery
    G.loadFile = function(fn, callback){
         $.ajax({ url:fn, async:true}).done(function(data){
            callback(data);
        });
    };
}



