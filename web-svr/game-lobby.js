
http = require('http');
_ = require('underscore');

var games = {};



module.exports = function (app)
{
    app.post('/game', function(req, res){
        var game = {};
        game.name = req.body.name;
        game.map = req.body.map;
        game.port = req.body.port;
        game.host = req.hostname;
        game.key = game.host + ':' + game.port;
        games[game.key] =  game;
        res.end('New game: ' + req.body.name);
    });

    app.get('/game-list', function(req, res) {
            var list = [];
            for (var key in games)
                list.push(games[key]);
            res.json(list);
    });
    
    app.get('/lobby', function(req, res) {
        res.redirect('/public/lobby.html');
    });
        
    
    //periodically get game statuses from clients

    statsDone = true;
    statLoop = setInterval(function(){
        if(!statsDone) return;

        var g = Object.keys(games).length;
        if (g)
        {
            statsDone = false;
          for (var key in games)
          {
            var game = games[key];

                getGameStatus(game, function(mGame,data)
                {
                   
                    if (!data){ //lost connection
                        console.log('game-lobby: lost game ' +key);
                        delete mGame;
                    }
                    else{
                        _.extend(mGame, data);
                    }
                    g--;
                    if (g <= 0){
                        statsDone = true;
                    }
                });

          }
        }
    }, 1000);

};

function getGameStatus(game, callback)
{
    var options = 
    {
        hostname: game.host,
        path: '/game-status',
        port: game.port,
        agent: false
   };
    var req = http.get(options, function(res){
        //console.log('Game status: ' + res.statusCode);
        var str = '';
        res.on('data', function(chunk){
            str += chunk;
        });
        res.on('end', function(){
            var obj = JSON.parse(str);
            callback(game,obj)
        });
    }).on('error', function(e) {
        console.log('Game status got error: ' + e.message);
        callback(game,null);
    });
}


