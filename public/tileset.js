
if (typeof module !== 'undefined' && module.exports){
    var _ = require('underscore');
    var async = require('async');
    var $ = require('jquery')(require('jsdom').jsdom().parentWindow);
    var glMat = require('gl-matrix');
    var vec3 = glMat.vec3;
    module.exports = Tileset;
}

G.tilesets = [];

function Tileset()
{

    this.tiles = [];
    
    this.verts = []; //coord, texture coord, & normals 
    this.tris = []; // indexes to verts
    this.maskTris = []; // 3 points and edge normals (for collision detection)

}

Tileset.prototype.load = function(gl,fd, callback) 
{
    
    var self = this;

    //make sure tileset doesn't already exist
    var name = fd.split('/').pop(); //just the name
    _.each(G.tilesets, function(t){
        if (name === t.name)
            return t;
    });

    self.name = name;

    //$.ajax({url:fd, async:true}).done( function(res)
    G.loadFile(fd, function(res)
      {
            //MESH (VERTS,TEXCOORDS)

            var $mesh = $(res).find('mesh');
            self.loadMesh(gl,$mesh);

            if (gl) {
            var $texture = $(res).find('texture');
            var tex = $texture.find('name').html().trim();
            // Load an image to use. Returns a WebGLTexture object
            self.texture = G.renderer.loadImageTexture(gl, "./public/tilesets/" + tex);
            }

            //Misc
            var str = $(res).find('tileWidth').html();
            self.tileW = parseFloat(str);
            str = $(res).find('tileHeight').html();
            self.tileH = parseFloat(str);

            //--TILES--

            self.minDepth = 0;
            self.maxDepth = 0;
            var $tiles = $(res).find('tile');
            _.each($tiles, function(t)
                    { 
                    var tile = self.loadTile(gl,$(t));
                    self.tiles.push(tile);
                    self.minDepth = Math.min(self.minDepth, tile.minDepth);
                    self.maxDepth = Math.max(self.maxDepth, tile.maxDepth);

                    });
            // add flipped triangles where necessary
            var len = self.tiles.length;
            for (var i=0; i < len; i++) {
                if (self.tiles[i].numTris > 0)
                    self.addFlippedTile(i);
            }



            // send data to GL
            if (gl)
            { 
                // build GL arrays 
                var vertData = [];
                var normData = [];
                var tcoordData = [];
                var elemData = [];
                var maskData = [];

                _.each(self.verts, function(v) {
                        vertData.push.apply(vertData, v.co);
                        normData.push.apply(normData, v.no);
                        tcoordData.push.apply(tcoordData, v.tco);
                        });

                _.each(self.tris, function(t) {
                        elemData.push.apply(elemData,t.p); });
                //so we can draw the mask tris
                var verts = [];
                _.each(self.maskTris, function(t) {
                        maskData.push.apply(maskData,t.p[0].concat(t.p[1]).concat(t.p[2]));
                        });

                self.glTcoords = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, self.glTcoords);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tcoordData), gl.STATIC_DRAW);

                self.glVerts = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, self.glVerts);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertData), gl.STATIC_DRAW);

                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                self.glElems = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.glElems);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elemData), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

                self.glMaskVerts = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, self.glMaskVerts);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(maskData), gl.STATIC_DRAW);

                // Enable all of the vertex attribute arrays.
                gl.enableVertexAttribArray(0);
                gl.enableVertexAttribArray(1);
                // gl.enableVertexAttribArray(2);

                // Set up all the vertex attributes for vertices, normals and texCoords
                gl.bindBuffer(gl.ARRAY_BUFFER, self.glVerts);
                gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, self.glTcoords);
                gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);


                /*
                   gl.bindBuffer(gl.ARRAY_BUFFER, tset.norms);
                   gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
                 */


                // Bind the index array
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.glElems);

            }
            // add to global tilesets
            G.tilesets.push(self);
            callback();
      });//loadFile
}

Tileset.prototype.loadMesh = function(gl,$mesh)
{
    var self = this;
    //VERTICES, NORMS, & TEXCOORDS
    var debug = {};
        debug.verts = [];
        debug.tris = [];
        debug.tcoords = [];
        debug.norms = [];
    var str = $mesh.find('verts').html();
    var lstr = str.trim().split("\n"); //each line is as follows: geometry, norm, texcoords respectivly
    _.each(lstr, function(v){
        
        var vert = {
            co:[], // coord vec3
            tco:[], // texture coord vec2
            no:[] // normal vec3
            };
        var s = v.split(/\)\s*\(/);

        //verts
        s[0] = s[0].replace(/[\(\)\n]+/g,''); // remove single'(' or' )' leftover from splice()
        debug.verts.push(s[0].trim())
        var vstr = s[0].trim().split(' ');
        _.each(vstr, function(f){
            vert.co.push(parseFloat(f)); });

        //norms
        s[1] = s[1].replace(/[\(\)\n]+/g,''); // remove single'(' or' )' leftover from splice()
        debug.norms.push(s[1].trim());
        vstr = s[1].trim().split(' ');
        _.each(vstr, function(f){
            vert.no.push(parseFloat(f)); });
        vec3.normalize(vert.no,vert.no);

        //tex coords
        s[2] = s[2].replace(/[\(\)\n]+/g,''); // remove single'(' or' )' leftover from splice()
        vstr = s[2].trim().split(' ');        
        debug.tcoords.push(s[2].trim())
        _.each(vstr, function(f){
            vert.tco.push(parseFloat(f)); });

        self.verts.push(vert); 
    });
    // TRIANGLES
    str = $mesh.find('tris').html();
    lstr = str.trim().split("\n");
    _.each(lstr,function(v) {
        var tri = { p:[] }; 
        var s = v.split(" ");
        _.each(s, function(f){
            tri.p.push(parseInt(f)); });
        self.tris.push(tri);
    });
   
   
}

Tileset.prototype.loadTile = function(gl,$tile) {

    var self = this;
    var tile = {};
    ///// VISUAL TRIS
    var str = $tile.find('numTris').html();
    tile.numTris = parseInt(str);

    str = $tile.find('numVerts').html();
    tile.numVerts = parseInt(str);
    str = $tile.find('verts').html();
    tile.verts = parseInt(str);

    str = $tile.find('tris').html();
    var v = str.trim().split(' ');
    tile.tris = _.map(v, function(i) {
        return parseInt(i); });
    tile.tris.push(tile.tris[0]+tile.numTris);

    ///// MASK TRIS
    str = $tile.find('numMaskTris').html();
    tile.numMaskTris = parseInt(str);
    tile.maskTris = self.maskTris.length;
    if (tile.numMaskTris)
    {

        str = $tile.find('maskTris').html();
        lstr = str.trim().split("\n"); //each line is as follows: geometry, norm, texcoords respectivly
        _.each(lstr, function(v)
         {
                var s = v.split(/\)\s*\(/);
                var tri = {};
                tri.p = [[],[],[]]; //vec2 3 points of a tri
                tri.norms = [[],[],[]]; //vec2 edge normals

                var i;
                for (i=0; i < s.length; i++) //3 points
                {
                s[i] = s[i].replace(/[\(\)\n]+/g,''); // remove single'(' or' )' leftover from splice()
                var vstr = s[i].trim().split(' ');
                tri.p[i].push(parseFloat(vstr[0]));
                tri.p[i].push(parseFloat(vstr[1]));
                }
        // find normals
            for (i=0; i < 3; i++)
            {
                var n = [];
                vec2.sub(n,tri.p[(i+1)%3],tri.p[i])
                    tri.norms[i] = [n[1],-n[0]];
                vec2.normalize(tri.norms[i],tri.norms[i]);
            }
            self.maskTris.push(tri);
        });
    }
    // MISC
    str = $tile.find('minDepth').html();
    tile.minDepth = parseFloat(str);

    str = $tile.find('maxDepth').html();
    tile.maxDepth = parseFloat(str);

    return tile;
}

Tileset.prototype.addFlippedTile = function(t)
{
    var self = this;

    var tw = self.tileW * 0.5;
    // create flipped verts and tris
    var nVerts = self.verts.length;
    var nTris = self.tris.length;
    //verts.resize (verts.size() + tiles[t].numVerts);
    var v = self.tiles[t].verts,
        tr = self.tiles[t].tris[0];
    for (var i=0; i < self.tiles[t].numVerts; i++)
    {
        var vert = {};
        vert.co = _.clone(self.verts[v+i].co);
        vert.co[0] = tw - (vert.co[0] - tw); // flip the X dimension along the center of the tile
        vert.tco = _.clone(self.verts[v+i].tco);
        vert.no = _.clone(self.verts[v+i].no);
        vert.no[0] *= -1;
        self.verts.push(vert);
    }

    //tris.resize (tris.size() + tiles[t].numTris);
    for (var i=0; i < self.tiles[t].numTris; i++)
    {
        var tri = {};
        tri.p = new Array(3);
        for (var j=0; j < 3; j++) {
            tri.p[2-j] = nVerts + self.tris[tr+i].p[j] - v;
        }
        self.tris.push(tri);
    }
    //flip mask
    var nMTris = self.maskTris.length;
    var mtris = self.tiles[t].maskTris;
    //maskTris.resize (maskTris.size() + tiles[t].numMaskTris);
    for (var i=0; i < self.tiles[t].numMaskTris; i++)
    {
        var tri = {};
        tri.p = new Array(3);
        tri.norms = new Array(3);
        for (var j=0; j < 3; j++)
        {
            var co = _.clone(self.maskTris[i+mtris].p[j]);
            co[0] = tw - (co[0] - tw);
            tri.p[2-j] = co;

            co = _.clone(self.maskTris[i+mtris].norms[(4-j)%3]);
            co[0] = -co[0];
            tri.norms[j] = co;
        }
        self.maskTris.push(tri);
    }

    var ft = {};
    ft.minDepth = self.tiles[t].minDepth;
    ft.maxDepth = self.tiles[t].maxDepth;
    ft.tris = new Array(self.tiles[t].tris.length);
    for (var i=0; i < self.tiles[t].tris.length; i++)
        ft.tris[i] = self.tiles[t].tris[i] - self.tiles[t].tris[0] + nTris;

    ft.numTris = self.tiles[t].numTris;
    ft.verts = nVerts;
    ft.numVerts = self.tiles[t].numVerts;
    ft.maskTris = nMTris;
    ft.numMaskTris = self.tiles[t].numMaskTris;
    ft.flip = -t;
    self.tiles[t].flip = self.tiles.length;

    self.tiles.push(ft);
}

