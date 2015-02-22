
// node js
if (typeof module !== 'undefined' && module.exports){
    var _ = require('underscore');
    var glMat = require('gl-matrix');
    var vec3 = glMat.vec3;
    module.exports = Entity;
}

function NetEntity()
{
    this.pos = [0,0,0];
    this.vel = [0,0,0];
    this.anim = G.ANIM_NONE;
    this.orient = 1;
    this.prevPos = [0,0,0];
    this.time = 0;
    this.sockID = 0;
}

NetEntity.prototype.writeToEntity = function(ent, asNext)
{
    var self = this;
        ent.entID = self.entID;
        if (asNext == true)
            ent.nextPos = vec3.clone(self.pos);
        else ent.pos = vec3.clone(self.pos);
        ent.vel = vec3.clone(self.vel);
        ent.orient = self.orient;
        ent.type = self.type;
        if (self.bounds)
            ent.bounds = _.clone(self.bounds);
        if (ent.actor)
        {
            if (ent.actor.anim != self.anim)
            {
                ent.actor.setAnim(self.anim);
            }
        }
}

NetEntity.prototype.readFromEntity = function(ent)
{
    var self = this;
        self.entID = ent.entID;
        self.pos = vec3.clone(ent.pos);
        self.vel = vec3.clone(ent.vel);
        self.orient = ent.orient;
        self.type = ent.type;
        if (ent.bounds)
            self.bounds = _.clone(ent.bounds);
        if (ent.actor)
            self.anim = ent.actor.anim;
}
NetEntity.prototype.copy = function(nent)
{
    var self = this;
        self.entID = nent.entID;
        self.pos = vec3.clone(nent.pos);
        self.vel = vec3.clone(nent.vel);
        self.orient = nent.orient;
        self.type = nent.type;
        if (nent.bounds)
            self.bounds = _.clone(nent.bounds);
        self.anim = nent.anim;
}

function Entity() {
    var self = this;
    this.type = 0;
    this.bounds = {};
    this.bounds.type = G.BT_AABB;
    this.bounds.half = [16,20];

    this.pos = [0,0,0];
    this.nextPos = [0,0,0];
    this.vel = [0,0,0];

    this.flags = G.ES_CHANGED;
    this.used = false;
    this.time = 0;
    this.life = -1; //stay alive indefinitely 
    this.destroy = false;
    this.netIn = new NetEntity(); //entity data from the network (pos, vel, etc)
    this.netOut = new NetEntity(); // entity data to send network
   

};

 // default render of the bounding box
Entity.prototype.render = function(gl)
{
    var self = this;
    var p = self.pos;

    G.renderer.setShader(gl,G.shaders.simple);

    gl.uniform3f(G.shaders.simple.V.u_translate,p[0],p[1],p[2]);
    gl.uniform3f(G.shaders.simple.V.u_color, 1,0,0);
    G.renderer.drawBounds(gl,self.bounds);

};

Entity.prototype.update = function()
{
	this.computeNextPosition (1.0);
}

Entity.prototype.computeNextPosition = function(time)
{
    var self = this;
	vec3.scaleAndAdd(self.nextPos, self.pos, self.vel,time);
}



