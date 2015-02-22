
// drawing passes
G.R_OPAQUE = 0;
G.R_ALPHA = 1;
G.R_ALPHA_FRONT = 2;
    
G.renderer = new Renderer();

function Renderer()
{
    this.renderPass = 0;
    this.activeShdr = null;
    this.prevShdr = null;
}

Renderer.prototype.setShader = function(gl, shdr)
{
    this.prevShdr = this.activeShdr;
    this.activeShdr = shdr;
    gl.useProgram(shdr.prog);
}

//=== drawTiles() ===
Renderer.prototype.drawTiles = function(gl, tiles, w, h, tileW, tileH, clip)
{
    var self = this;

	var tset = G.map.tilesets[0];

	var t;
	var offsetX = clip.x1*tileW;
	var offsetY = -clip.y1*tileH;
	var tris,numTris;

	var endx = clip.x2,
	    endy = clip.y2;
	var tranX = offsetX;
	var tranY = offsetY;
	for (var y=clip.y1; y < endy; y++)
	{
		tranX=offsetX;
		for (var x=clip.x1; x < endx; x++)
		{
			t = y*w+x;
			var tile = tset.tiles[Math.abs(tiles[t])];
            if (tile.numTris)
            {
			  tris = tile.tris[self.renderPass];
			  numTris = tile.tris[self.renderPass+1] - tris;
			  if (numTris)
			  {
                gl.uniform3f(self.activeShdr.V.u_translate, tranX, tranY, 0.);
                gl.drawElements(gl.TRIANGLES, numTris*3, gl.UNSIGNED_SHORT, tris*3*2);
			  }
            }
			tranX += tileW;

		}
		tranY += -tileH;
	}
	gl.uniform3f(self.activeShdr.V.u_translate,0.,0.,0.);

}

//=== drawMask() ===
Renderer.prototype.drawMask = function(gl, tiles, w, h, tileW, tileH, clip)
{
    var self = this;
	var tset = G.map.tilesets[0];

	var t;
	var offsetX = clip.x1*tileW;
	var offsetY = -clip.y1*tileH;
	var tris,numTris;

	var endx = clip.x2,
	    endy = clip.y2;
	var tranX = offsetX;
	var tranY = offsetY;
	for (var y=clip.y1; y < endy; y++)
	{
		tranX=offsetX;
		for (var x=clip.x1; x < endx; x++)
		{
			t = y*w+x;
			var tile = tset.tiles[Math.abs(tiles[t])];
			tris = tile.maskTris;
			numTris = tile.numMaskTris;
			if (numTris)
			{
                gl.uniform3f(self.activeShdr.V.u_translate, tranX, tranY, 0.);
                gl.drawArrays(gl.TRIANGLES, tris*3, numTris*3);
			}
			tranX += tileW;

		}
		tranY += -tileH;
	}
	gl.uniform3f(self.activeShdr.V.u_translate,0.,0.,0.);

}

// used for debug purposes
Renderer.prototype.draw2dTris = function(gl, points)
{
    var self =  G.renderer;
    if (!self.glTris)
        self.glTris = gl.createBuffer();
    var verts = [];
    for (var i=0; i < points.length; i++)
        verts.push.apply(verts, points[i]);


    gl.bindBuffer(gl.ARRAY_BUFFER, self.glTris)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

Renderer.prototype.drawBounds = function(gl, bounds)
{
//        console.log(bounds.type);
    if (bounds.type != G.BT_AABB) return; //FIXME draw other types

    var self = G.renderer;

    if (!self.glBBox)
        self.glBBox = gl.createBuffer();


    gl.bindBuffer(gl.ARRAY_BUFFER, self.glBBox);

   var r = bounds.half;
   var verts = [
            -r[0], r[1],
            -r[0], -r[1],
            r[0], -r[1], 
            r[0], r[1] ];

   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
   gl.drawArrays(gl.LINE_LOOP, 0, 4);


}

Renderer.prototype.drawSprite = function(gl, sprite, frm, sw, sh, facing)
{

    var self = G.renderer;

    if (!G.sprites.glVerts)
    {
        G.sprites.glVerts = gl.createBuffer();
        G.sprites.glTcoords = gl.createBuffer();
    }


   var r = [sprite.width*0.5*sw, sprite.height*0.5*sh];
   var verts = [
            -r[0], r[1],
            -r[0], -r[1],
            r[0], -r[1], 
            r[0], -r[1], 
            r[0], r[1],
            -r[0], r[1]];
   var t = [sprite.width/sprite.texture.width, sprite.height/sprite.texture.height];
   var hw = t[0] * 0.5;
   var i = t[0]*frm + hw;
   var tr = hw * facing;
   var tcoords = [
            i - tr, -t[1],
            i - tr , 0,
            i + tr, 0, 
            i + tr, 0, 
            i + tr, -t[1],
            i - tr, -t[1]];

   gl.bindTexture(gl.TEXTURE_2D, sprite.texture.gl);

   gl.bindBuffer(gl.ARRAY_BUFFER, G.sprites.glVerts);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, G.sprites.glTcoords);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tcoords), gl.DYNAMIC_DRAW);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

}

Renderer.prototype.loadImageTexture = function(gl, url)
{
        var texture = {}
        texture.gl = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture.gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        var image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture.gl);
            gl.texImage2D(
                    gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.bindTexture(gl.TEXTURE_2D, null);
            texture.width = image.width;
            texture.height = image.height;
            }
        image.src = url;
        return texture;
}


