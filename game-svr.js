var express = require('express')
    , app = express()
    , server = require('http').Server(app)
    , http = require('http')
    , querystring = require('querystring')
    , bodyParser = require('body-parser')
    , multer = require('multer')
    , io = require('socket.io').listen(server);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
//app.use(express.logger());
//app.use(express.cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true }));
app.use(multer());
//app.use(express.methodOverride());


// clearly denote public content
app.use('/public', express.static('public'));


//======== game ==============
global.G = { };

G.port = 3000; //default port
G.name = 'Unnamed Game'; //default name
//command line args
var argStr = process.argv.splice(2,process.argv.length-2);
 argStr.forEach(function (val){
     var v = val.split('=');
     var name = v[0];
     if (name === '--port'){
         G.port = parseInt(v[1]);
      }
     else if (name === '--map' || name[0] !== '-'){
         if (name[0] !== '-'){
             var map = v[0];
         }else var map = v[1];
         G.mapName = map.split('.lvl').shift();
     }
     else if (name === '--name'){
         G.name = v[1];
     }
   });
var game = require('./game-svr/sockets.js')(io);

server.listen(G.port);
//app.listen(port);

function sendGameStatus()
{
    

    var postData = JSON.stringify({
        name: G.name,
        port: G.port
    });

    var options = 
    {
        host:'www.trebek.club',
        path: '/game',
        port: '80',
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Content-Length': postData.length
        }
   };
    var req = http.request(options, function(res){
        var str = '';
        res.on('data', function(chunk){
            str +=chunk;
        });
        res.on('end', function() {
            console.log(str);
        });
    });
    req.on('error', function(e){
        //console.log('problem with request: ' + e.message);
        //try again
        setTimeout(sendGameStatus(), 5000);
    });
    req.write(postData);
    req.end();


};

//make server aware that i'm launching a game
setTimeout(sendGameStatus(), 5000);

app.get('/game', function(req, res){
  res.render('game', { user: req.user });
});

app.get('/game-status', function(req, res){
    var game = {
        name: G.name,
        port: G.port,
        map: G.mapName
    };
    res.send(JSON.stringify(game));
});

