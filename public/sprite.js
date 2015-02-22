
if (typeof module !== 'undefined' && module.exports){ //Nodejs
    module.exports.Sprite = Sprite;
    module.exports.loadSprites = loadSprites;
    module.exports.loadSprite = loadSprite;

    var G = global.G;

    var async = require('async');
    var _ = require('underscore');
}

G.sprites = { };
G.spriteNames = []; // a list of sprites to load

function Sprite()
{
    this.numFrames = 0;
    this.rowSize = 0;
    this.numRows = 0;
    this.fps = 24;
}

// names --> list of names of sprites to load
function loadSprites(gl, callback)
{
    async.eachSeries( G.spriteNames, function(name,callback){
        loadSprite( gl, name, function(){
            callback();
          });
        },
        function(err){
            callback()
        });
}

// name -> name of sprite (not including .sprt)
function loadSprite(gl, name, callback)
{

    if (G.sprites[name] && callback)
        callback(G.sprites[name]);


    var dir = "public/sprites/";
    G.loadFile(dir + name +'.sprt', function(data){

        var obj = JSON.parse(data)
        
        var sprite = new Sprite();
        sprite = _.extend(sprite, _.omit(obj, 'image'));

        if (obj.image)
        {
            sprite.imageName = obj.image;
            //check to see if texture already exists in another sprite
            for (key in G.sprites)
            {
                var s = G.sprites[key];
                if (s.imageName && !s.imageName.localeCompare(sprite.imageName))
                    sprite.texture = s.texture;
            }
            if (gl && !sprite.texture)
                sprite.texture = G.renderer.loadImageTexture(gl, dir + obj.image);
        }

        sprite.frameIncr = sprite.fps/G.PHYSICS_FPS;

        //add to global list
        G.sprites[name] = sprite;

        if (callback)
            callback(sprite);
    });
}


