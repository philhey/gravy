// requires tileset.js
// node js
if (typeof module !== 'undefined' && module.exports){
    var _ = require('underscore');
    var async = require('async');
    var $ = require('jquery')(require('jsdom').jsdom().parentWindow);
    var glMat = require('gl-matrix');
    var vec3 = glMat.vec3;
    var Tileset = require('../public/tileset.js');
    module.exports = Map;
}

function Map()
{
    this.tilesets = [];
    this.layers = [];
}

Map.prototype.load = function(gl,fn, callback) // fn --> filename of map
{
    var self = this;

    self.name = fn.split('/').pop();
    self.name = self.name.split('.lvl').shift();
    console.log('from map load: ' + self.name);

    G.loadFile(fn, function(xml)
            {
        
            async.parallel([
                function(callback){
                    //LOAD TILESET

                    var $tilesets = $(xml).find("tileset");
                    _.each($tilesets, function(t) {
                        var n = $(t).html();
                        var tset = new Tileset();
                        tset.load(gl,"./public/tilesets/" + n,function(){

                            self.tilesets.push(tset);
                            callback(); });
                        });
                }],
                function(err)
                {

                    if (err) callback(err);

                //LOAD MAP OBJECTS (entities, start pos...)
                    self.startPos = []; 
                    var $objs = $(xml).find("object");
                    _.each($objs, function(obj) {
                            var name = $(obj).find("name").html();
                            if (name == "StartPos"){
                               var str = $(obj).find("position").html();
                                str = str.replace(/[\(\)\n+]/g, '').trim();
                                var v = str.split(' ');
                                startPos = {};
                                startPos.pos = [parseFloat(v[0]), parseFloat(v[1]), parseFloat(v[2])];
                                self.startPos.push(startPos);
                            }
                          });

                //LAYERS
                var $layers = $(xml).find('layer');
                _.each($layers, function(l){
                        var $lay = $(l);
                        var lay = {};
                        lay.width = parseInt($lay.find('width').html());
                        lay.height = parseInt($lay.find('height').html());
                        lay.depth = parseFloat($lay.find('depth').html());
                        //Tile data
                        var $tile = $lay.find('tile');
                        lay.tileW = parseFloat($tile.find('width').html());
                        lay.tileH = parseFloat($tile.find('height').html());
                        var vstr = $tile.find('data').html().split(',');
                        vstr.pop(); // remove last comma
                        lay.tiles = _.map(vstr, function(t) {
                            return parseInt(t) });
                        //find flipped tiles (-)
                        if(1)
                        for (var i=0; i < lay.tiles.length; i++)
                        {
                        var t = lay.tiles[i];
                        if (t < 0){
                        lay.tiles[i] = self.tilesets[0].tiles[-t].flip;
                        }
                        }

                        self.layers.push(lay);
                });

                callback(null);
                });//async
            });//ajax

}

Map.prototype.collisionCheck = function (entity)
{
    var self = this;
    var lay = self.layers[0]; //FIXME
    var tileset = self.tilesets[0]; //FIXME
    var result = { };
    result.hasCollided = false; 
    result.fraction = 1000.0;
    result.normal = [0,0,0];
    if (!lay)
        return;
    var start = vec3.clone(entity.pos),
          end = vec3.clone(entity.nextPos);

    var aabb = vec2.clone(entity.bounds.half);
    var minX,maxX,
        minY,maxY;
    var min = vec3.clone(start);
    var max = vec3.clone(end);
    for (var i=0;i < 3; i++)
        if (max[i] < min[i])
        {
            var t = min[i];
            min[i] = max[i];
            max[i] = t;
        }
    min[0] -= aabb[0];
    min[1] -= aabb[1];
    max[0] += aabb[0];
    max[1] += aabb[1];
    
    var tw = lay.tileW,
        th = lay.tileH;
    minX = Math.floor (min[0]/tw);
    minY = Math.floor (-max[1]/th);
    maxX = Math.floor ((max[0]+tw)/tw);
    maxY = Math.floor ((-min[1]+th)/th);
    minX = Math.max (minX,0);
    minY = Math.max (minY,0);
    maxX = Math.min (maxX,lay.width);
    maxY = Math.min (maxY,lay.height);

    for (var y = minY; y < maxY; y++)
        for (var x = minX; x < maxX; x++)
        {
            var tile = tileset.tiles[lay.tiles[y*lay.width+x]];
            var tilePos= [x*tw,-y*th];
            for (var f = 0; f < tile.numMaskTris; f++)
            {
                var tri = { };
                tri.p = [];
                tri.norms = [];
                
                for (var v=0; v < 3; v++)
                {
                    var i = tile.maskTris+f;
                    var p = vec2.clone(tileset.maskTris[i].p[v]);
                    vec2.add(p, p, tilePos);
                    tri.p.push(p);
                    tri.norms.push(vec2.clone(tileset.maskTris[i].norms[v]));
                }
                
                var res = Collision.halfAabbCollisionTriangle (entity.bounds, start, end, tri);
                if (res.hasCollided)
                {

                    if (res.fraction < result.fraction)
                    {
                        G.debug.ctri = tri;
                        G.debug.cnormal = res.normal;
                        result = res;
                    }
                }
                        
            }
        }
    if (!result.hasCollided)
        result.fraction = 1.0;

    return result;
    
}

Map.prototype.update = function()
{
    for (var i=0; i < G.entities.length; i++)
    {
        var ent = G.entities[i];
        if (ent.used && ent.update)
            ent.update();
    }
}
        
Map.prototype.render = function(gl, camera)
{
    var self = this;
    if (self.layers.length == 0) return;

    var lay = self.layers[0];
    

    // Construct the model-view * projection matrix and pass it in
    var mMat = mat4.clone(camera.mat);
    mMat[12] *= -1;
    mMat[13] *= -1;
    mMat[14] *= -1;
    var pMat = mat4.clone(camera.projMat);
    var mvpMat = [];
    mat4.multiply(mvpMat,pMat,mMat);
    // load into all loaded shaders
    for (s in G.shaders)
    {
        var shdr = G.shaders[s];
        gl.useProgram(shdr.prog);
        gl.uniformMatrix4fv(shdr.V.u_modVProjMat, false, mvpMat);
    }
    G.renderer.setShader(gl,G.shaders.tile);
    
    
    if (!G.showMask)
    {
        //draw tiles
        G.renderer.renderPass = G.R_OPAQUE;
        self.renderLayer(gl, camera, lay);

        //draw background alpha tris (of tiles), entities, then foreground alpha tris
        G.renderer.renderPass = G.R_ALPHA;
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(0);

        self.renderLayer(gl, camera, lay);

        gl.depthMask(1);
        gl.disable(gl.BLEND);
    }
    else 
        self.renderLayer(gl, camera, lay);
}

////////////////////
// RENDER LAYER 
////////////////////
Map.prototype.renderLayer = function(gl,camera, lay)
{
    var self = this;

    var tileset = self.tilesets[0]; //FIXME
    // create clip rect
    var clip = { };
    var s = camera.getDrawScale (lay.depth + tileset.minDepth);
    var cw = 1.0/(s[0]*lay.tileW),
        ch = 1.0/(s[1]*lay.tileH);
    var cpos = camera.getPosition();
    var x = (cpos[0]*s[0] - 1.0) * cw,
        y = (-cpos[1]*s[1] - 1.0) * ch;
    clip.x1 = Math.max(Math.floor(x),0);
    clip.y1 = Math.max(Math.floor(y), 0);
    clip.x2 = Math.min(Math.floor(x + cw*2.0) + 1, lay.width);
    clip.y2 = Math.min(Math.floor(y + ch*2.0) + 1, lay.height);


    //var clip = { x1:0,y1:0, x2:lay.width, y2:lay.height };
    // Draw a tile

    if (!G.showMask)
    {
        G.renderer.setShader(gl,G.shaders.tile);
        gl.uniform4f(G.shaders.tile.V.u_color, 1, 1, 1, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, tileset.glVerts);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, tileset.glTcoords);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);
        // Bind the texture to use
        gl.bindTexture(gl.TEXTURE_2D, tileset.texture.gl);

        if (G.renderer.renderPass == G.R_OPAQUE)
        {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tileset.glElems);

            G.renderer.drawTiles(gl, lay.tiles, lay.width, lay.height, tileset.tileW, tileset.tileH, clip);
        }

        else if (G.renderer.renderPass == G.R_ALPHA)
        {
            G.renderer.drawTiles(gl, lay.tiles, lay.width, lay.height, tileset.tileW, tileset.tileH, clip);

           // draw entities
            for (var i=0; i < G.entities.length; i++)
                if (G.entities[i].used && G.entities[i].render)
                    G.entities[i].render(gl, camera);

            // draw tile tris that are in front of entities, i.e. tall grass
            // Bind the texture to use
            G.renderer.setShader(gl,G.shaders.tile);
            gl.bindTexture(gl.TEXTURE_2D, tileset.texture.gl);

            G.renderer.renderPass = G.R_ALPHA_FRONT;
            gl.bindBuffer(gl.ARRAY_BUFFER, tileset.glVerts);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tileset.glTcoords);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
            G.renderer.drawTiles(gl, lay.tiles, lay.width, lay.height, tileset.tileW, tileset.tileH, clip);
        }
    }
    else // show mask
    {
        G.renderer.setShader(gl,G.shaders.simple);
        gl.uniform3f(G.shaders.simple.V.u_color, 1, 1, 1);

        gl.disableVertexAttribArray(1);
        gl.bindBuffer(gl.ARRAY_BUFFER, tileset.glMaskVerts);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        G.renderer.drawMask(gl, lay.tiles, lay.width, lay.height, tileset.tileW, tileset.tileH, clip);
        // draw entities
       for (var i=0; i < G.entities.length; i++)
            if (G.entities[i].used == true && G.entities[i].render)
                 G.entities[i].render(gl, camera);
    }

}





