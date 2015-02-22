
    
G.entities = [];


G.clients = []; // game clients
G.isServer = true;

var _ = require('underscore');
var async = require('async');
var glMat = require('gl-matrix');
var vec3 = glMat.vec3;

var gt = require('../public/game-types.js');
_.extend(G, gt.types);

G.netRole = G.NR_SERVER;

require('../public/file-loader.js');
require('../public/keys.js');

var sprite = require('../public/sprite.js');
var Entity = require('../public/entity.js');
var Player = require('../public/player.js');
var Map = require('../public/map.js');
var collision = require('../public/collision.js');

G.PHYSICS_FPS = 60;
G.PHYSICS_FRAME_LEN = 1000.0/G.PHYSICS_FPS



for (var i=0; i<G.MAX_ENTITIES; i++)
{
    var ent = new Entity();
    ent.entID = i;
    G.entities.push(ent);
};


var gameRunning = false;


function getNetEntities(client, flags)
{
    var ret = [];
    var clEnt = G.entities[client.entID];
      _.each(G.entities, function(e) {
          if (!e.used || (clEnt.changeCause != G.CC_SERVER && client.entID == e.entID)) return;
        
          if (e.flags & flags || flags == G.ES_ALL)
          {
              ret.push(e.netOut);
          }
        });
   return ret;
}

function init(callback)
{
    
    async.parallel([
            function(callback){

                sprite.loadSprites(null, function(){
                callback()});
            }],
            function (err)
            {

            var map = new Map();
            map.load(null,"./public/levels/" + G.mapName + '.lvl', function(err){

                G.map = map;
                if (callback)
                    callback();
            });
        });
}
// GAME LOOP
G.main = function()
{
        
   var startTime = new Date().getTime();
   //update from network
    for (var i=0; i < G.entities.length; i++)
    {
       var e = G.entities[i];
       e.changeCause = G.CC_NONE;
       if (e.used==true && e.netRole & G.NR_NETWORK && e.netIn.flags & G.ES_CHANGED)
       {
        //e.netOut.readFromEntity(e);
           e.changeCause = G.CC_CLIENT;
           e.netIn.writeToEntity(e,true);
           //e.netIn.writeToEntity(e,false);
           e.netIn.flags = G.ES_NONE;
           e.flags |= G.ES_CHANGED;
        }
    }

   //TODO: collision check with other entities
   //collision.collisionCheckWorld();

    for (var i=0; i < G.entities.length; i++)
    {
        var e = G.entities[i];
        if (e.used == false) continue;

        //e.pos = vec3.clone(e.nextPos);
        if (0 && e.cres.hasCollided){
            //e.pos = vec3.clone(e.netOut.pos);
            e.netOut.writeToEntity(e);
            e.changeCause = G.CC_SERVER;
            e.flags |= G.ES_CHANGED;
            //console.log('collide');
        }
        else if (e.flags & G.ES_CHANGED && e.netRole & G.NR_NETWORK)
            e.netIn.writeToEntity(e);

        e.netOut.readFromEntity(e);
        if (e.destroy == true){
             e.netOut.entID = -(e.entID+1); //negative IDs means the client should delete entity
        }
    }
   // SEND GAME STATUS TO CLIENTS
   _.each(G.clients, function(c) {
       if (c && c.isNew) //send the all game data
        {
         c.isNew = false; 
         c.socket.emit('game-cycle', getNetEntities(c, G.ES_ALL));
        }
       else if (c)
         c.socket.emit('game-cycle', getNetEntities(c, G.ES_CHANGED));
   });

   _.each(G.entities, function(e) {
       if (!e.used) return;

       e.flags ^= e.flags & G.ES_CHANGED; //the change has been broadcast, so set to no change
       if (e.destroy == true) e.used=false;

       if (e.life > 0){
            e.life--;
            if (e.life == 0)
            {
                e.destroy = true;
                e.flags |= G.ES_CHANGED;
            }

            // quick hack for fun. TODO remove
            else if(e.lifespan > 0) {
               var s = (e.life*10)/e.lifespan
                    if (s < 1){
                        var past = e.lifespan/((e.life+1)*10)
                        e.bounds.half[0] = e.bounds.half[0]*past*s;
                        e.bounds.half[1] = e.bounds.half[1]*past*s;
                        e.flags |= G.ES_CHANGED;
                    }
            }
       }
       

       });

   var endTime = new Date().getTime();
   var totalTime = endTime - startTime;
   var wait = Math.max(G.PHYSICS_FRAME_LEN - totalTime, 10);
   //done...repeat
   setTimeout(function(){ G.main(); }, wait);

};
module.exports = function(io)
{
    // start game loop
    init(G.main());

    io.on('connection', function (socket) {
            // find an unused entity for the client

            var free = _.findWhere(G.entities, {used: false});
            if (!free)
            {
                console.log("Max entities reached!!!");
                return;
            }
            
            var id = free.entID
            G.entities[id] = new Player(G.NR_NETWORK);
            var ent = G.entities[id];
            ent.entID = id;

            ent.used = true;
            //ent.bounds = { type: G.BT_AABB, half: [16,20]}
            ent.netIn.readFromEntity(ent);
            ent.netIn.sockID = socket.id;
                


            var client = {
                socket: socket,
                entID: ent.entID,
                isNew: true
            };

            ent.netOut.readFromEntity(ent);
            
            var data = {
                 ent: ent.netOut,
                 sockID: socket.id,
                 map: G.mapName
                 };

            socket.emit('join-game', data);
            // alert other players
            data = { entity: ent.netOut };
            _.each(G.clients, function(c) {
                c.socket.emit('new-player', data); });
            
            //finally add to list of clients
            G.clients.push(client);


            socket.on('disconnect', function (){
                var c = _.findWhere(G.clients, {socket: socket});
                var ent = G.entities[c.entID];
                ent.destroy = true;
                ent.flags |= G.ES_CHANGED;

                G.clients.splice(G.clients.indexOf(c), 1);
                });

            socket.on('client-status', function (data){
                var e = G.entities[data.ent.entID];
                if (e.netIn.sockID !== data.sockID) //mmmm some malicious activity?!
                    return; // hacker no hacking!
                var ne = e.netIn;
                ne.copy(data.ent);
                ne.flags = G.ES_CHANGED;
                //bullets
                _.each(data.bullets, function(b){
                    var free = _.findWhere(G.entities, {used: false});
                    if (!free)
                    {
                        console.log("Max entities reached!!!");
                        return;
                    }
                    var id = free.entID;
                    G.entities[id] = new Entity();
                    var ent = G.entities[id];
                    ent.entID = id;
                    ent.used = true;
                    ent.type = b.type;
                    ent.pos = b.pos;
                    ent.nextPos = b.pos;
                    ent.vel = b.vel;
                    ent.lifespan = G.PHYSICS_FPS * 10;
                    ent.life = ent.lifespan;
                    var w = Math.floor((Math.random() * 20) + 5);
                    var h = Math.floor((Math.random() * 20) + 5);
                    ent.bounds = {
                        type: G.BT_AABB,
                        half: [w,h] };
                    ent.flags = G.ES_CHANGED;
                });

            });
    });

};

