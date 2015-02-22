

if (typeof module !== 'undefined' && module.exports){
    var Entity = require('../public/entity.js');
    var glMat = require('gl-matrix');
    var vec2 = glMat.vec2;
    var vec3 = glMat.vec3;
    module.exports = Player;

    var G = global.G;
}

// sprites that will need to be loaded of player
G.spriteNames.push.apply(G.spriteNames, ['bear_idle', 'bear_jump', 'bear_run', 'bear_land']);

var PlayerPhys = {
 walkAccel : 0.5,
 runInitAccel : 0.6,
 runAccel : 0.7,
 flyAccel : 1.0,
 maxWalkSpeed : 8.0,
 maxRunSpeed : 15.0,
 maxAirRunSpeed : 10.0,
 maxFallSpeed : -25.0,
 maxFlySpeed : 5.0,
 jumpAccel : 4.5,
 friction : 0.1,
 groundFriction : 0.3,
 gravity : 0.5, //0.5
 maxSlopeAngle : 30.0/180.0 * Math.PI,
 maxSlope : [Math.cos(this.maxSlopeAngle), Math.sin(this.maxSlopeAngle)]
};

var PlayerActions = [
{ action: function(self, kstate){self.actionWalk(kstate, 1)}, key: G.KEY_NAME.right},
{ action: function(self, kstate){self.actionWalk(kstate, -1)}, key: G.KEY_NAME.left},
{ action: function(self, kstate){self.actionDown(kstate)}, key: G.KEY_NAME.down},
{ action: function(self, kstate){self.actionRun(kstate)}, key: G.KEY_NAME.shift},
{ action: function(self, kstate){self.actionJump(kstate)}, key: G.KEY_NAME.space},
{ action: function(self, kstate){self.actionFire(kstate)}, key: G.KEY_NAME.ctrl}
];


//for animation
function PlayerActor(player)
{
    var self = this;
    self.player = player;
    self.animTick = 0;
    self.animFrame = 0;
    self.hist = [];
    self.animFunc = null;
	self.anim = G.ANIM_NONE;
    self.frameIncr = .1; //anim speed
    if (G.sprites)
        self.currSprite = G.sprites.bear_idle;
};

PlayerActor.prototype.update = function()
{
    var self = this;
    self.animTick += self.frameIncr;
    if (self.animTick > 1){
        self.animTick = 0;
        self.animFrame++;
    }
    else if (self.animTick < 0){ //reverse animation
        self.animTick = 1;
        self.animFrame--;
    }

    if (self.animFunc)
        self.animFunc();
    
    if (self.anim == G.ANIM_NONE)
        self.setAnim(G.ANIM_NONE);

    self.animFrame = Math.abs(self.animFrame)%self.currSprite.numFrames;
};

PlayerActor.prototype.setAnim = function(anim)
{
    var self = this;
    if (G.netRole == G.NR_SERVER){
        self.anim = anim;
        return;
    }
    var dropDown = false;
    var player = self.player;
    switch(anim)
    {
        case G.ANIM_NONE:
            if (!player.isGrounded /*&& !self.isMoving*/)
            {       
                self.anim = G.ANIM_FALL_FORWARD;
                self.currSprite = G.sprites.bear_jump;
                self.frameIncr = self.currSprite.frameIncr;
                self.animFrame = 4;
                self.animFunc = function()
                {
                    self.animFrame = 4;
                    if (player.isGrounded)
                    {
                        self.animFrame = 7;
                        self.animFunc = function()
                        {
                            if (self.animFrame >= self.currSprite.numFrames)
                                self.anim = G.ANIM_NONE;
                        }

                    }

                }
            }
            if (player.isGrounded)
            {
                self.setAnim(G.ANIM_IDLE);
            }

            break;
        case G.ANIM_IDLE:
            self.anim = G.ANIM_IDLE;
            self.currSprite = G.sprites.bear_idle;
            self.frameIncr = self.currSprite.frameIncr;
            self.animFrame = 0;
            self.animFunc = function()
            {
                if (!player.isGrounded)
                    self.anim = G.ANIM_NONE;
            }
            break;
        case G.ANIM_WALK:
            //FIXME drop through 
            self.currSprite = G.sprites.bear_run;
            self.anim = G.ANIM_WALK;
            self.frameIncr = self.currSprite.frameIncr * .6;
            self.animFrame = 0;
            dropDown = true;
        case G.ANIM_RUN:
            if (!dropDown) // wasn't "case WALK")
            {
                if (!G.ANIM_WALK)
                    self.animFrame = 0;
                self.anim = G.ANIM_RUN;
                self.currSprite = G.sprites.bear_run;
                self.frameIncr = self.currSprite.frameIncr;
                dropDown = false;
            }
            self.animFunc = function()
            {
                if (player.netRole == G.NR_LOCAL)
                {
                    if (!player.isMoving && player.isGrounded)
                    {
                        self.setAnim(G.ANIM_BREAK);
                    }
                    else if (!player.isGrounded)
                        self.anim = G.ANIM_NONE;
                }

            }
            break;
        case G.ANIM_JUMP_FORWARD:
            if (!player.isGrounded) break; //fix a glitch in animation for network players
            self.anim = G.ANIM_JUMP_FORWARD;
            self.currSprite = G.sprites.bear_jump;
            self.frameIncr = self.currSprite.frameIncr;
            self.animFrame = 0;
            self.animFunc = function()
            {
                if (self.animFrame >= 4 || player.vel[1] < 0)
                {    
                    self.anim = G.ANIM_NONE;

                }
            }
            break;
        case G.ANIM_BREAK:
            self.anim = G.ANIM_BREAK;
            //self.currSprite = G.sprites.bear_idle;
            //self.animFrame = 5;
            self.animFunc = function()
            {
                self.frameIncr = self.currSprite.frameIncr * Math.abs(player.vel[0]/PlayerPhys.maxRunSpeed);
                //FIXME add break animation
                //self.animFrame = Math.max(self.animFrame, 5);
                if (!player.isGrounded || Math.abs(player.vel[0]) < 1)
                    self.setAnim(G.ANIM_NONE);
            }
            break;
        default:
            break;
    }
}

// inherits from entity
function Player(netRole)
{
     
    var self = this;
    Entity.call(this);

	self.type = G.ET_PLAYER;
    //type = NR_NETWORK or default to NR_LOCAL
    self.netRole = typeof netRole !== 'undefined' ? netRole : G.NR_LOCAL;

	self.collWith = G.ET_ENEMY | G.ET_MAP | G.ET_SHELL | G.ET_PLAYER;
    self.bounds = {};
	self.bounds.type = G.BT_AABB;
	self.bounds.half = [16,26];
	//self.bounds.half = [16,20];


	self.isMoving = false;
	self.isRunning = false;
	self.isGrounded = false;
	self.isCrouched = false;
	self.jumpCounter = 0;
	self.runCounter = 0;
    self.fireCounter = 0;
	self.orient = 1;
    self.actor = new PlayerActor(self);

}

Player.prototype = Object.create(Entity.prototype); // inherit from Entity


Player.prototype.render = function(gl,camera)
{
    var self = this;
   
       var r = self.bounds.half;
       var p = vec3.clone(self.pos);
       var showTrail = false;
       if(!G.showMask && 1)
       {
           G.renderer.setShader(gl,G.shaders.tile);

           var s = .6;
           sprt = self.actor.currSprite;
           p[1] += sprt.height*.5*s- self.bounds.half[1];
           //make a trail of past frames
           if (showTrail)
           {
               var hlen = self.actor.hist.length;
               for (var i=hlen-1; i >= 0; i--)
               {
                   var h = self.actor.hist[i];
                   var trailScale = vec2.sqrLen(h.vel);
                   if (trailScale < .1) continue;

                   trailScale /= PlayerPhys.maxRunSpeed*PlayerPhys.maxRunSpeed * 1;
                   var alpha = (hlen-i)/hlen;
                   alpha *= trailScale;
                   alpha = Math.min(1, alpha);

                   var hp = [];
                   vec3.sub(hp, p, h.pos);
                   vec3.scale(hp, hp, alpha);
                   vec3.add(hp, h.pos, hp);
                   gl.uniform4f(G.shaders.tile.V.u_color,1,1,1,alpha*.5);
                   gl.uniform3f(G.shaders.tile.V.u_translate,hp[0],hp[1],hp[2]);
                   G.renderer.drawSprite(gl,h.sprt, h.frm, s, s, h.orient);
               }
               gl.uniform4f(G.shaders.tile.V.u_color,1,1,1,1);
           }

           //draw current frame
           gl.uniform3f(G.shaders.tile.V.u_translate,p[0],p[1],p[2]);
           G.renderer.drawSprite(gl,sprt, self.actor.animFrame, s, s, self.orient);

           if (showTrail)
           {
               //record what we just drew (so we can draw trails)
               var rec = {
                   sprt: sprt,
                   frm: self.actor.animFrame,
                   pos: p,
                   vel: _.clone(self.vel),
                   orient: self.orient
               }
               self.actor.hist.unshift(rec);
               if (self.actor.hist.length > 6)
                   self.actor.hist.pop();
           }

       }

       //draw bounds
       p = vec3.clone(self.pos);
       if(G.showMask || 0)
       {
           G.renderer.setShader(gl,G.shaders.simple);

           gl.uniform3f(G.shaders.simple.V.u_translate,p[0],p[1],p[2]+.01);
           gl.uniform3f(G.shaders.simple.V.u_color,1,0,0);

           //draw

           //if(!self.client) console.log(self.bounds.half);
           G.renderer.drawBounds(gl,self.bounds);


       }

}


Player.prototype.update = function()
{
	var self = this;

    self.actor.update();
    //ANIMATION

    //// end animation


    var P = PlayerPhys;

    self.testGround (); // see whether there is ground right below


    if (self.vel[1] > P.maxFallSpeed)
    {
        self.vel[1] -= P.gravity;
    }
    if (self.vel[1] < P.maxFallSpeed)
        self.vel[1] = P.maxFallSpeed;
    if (!self.isMoving)
    {
        if (self.isGrounded && self.groundDist < 1.)
        {
            if (Math.abs(self.vel[0]) <= P.groundFriction)
                self.vel[0] = 0.;
            else if (self.vel[0] < 0)
                self.vel[0] += P.groundFriction;
            else if (self.vel[0] > 0)
                self.vel[0] -= P.groundFriction;
        }
        if (Math.abs (self.vel[0]) < 0.01)
            self.vel[0] = 0.;
        else if (self.vel[0] < 0)
            self.vel[0] += P.friction;
        else if (self.vel[0] > 0)
            self.vel[0] -= P.friction;

    }


    self.computeNextPosition (1.0);
}

Player.prototype.handleCollision = function(ent2, norm)
{
    var self = this;
    var P = PlayerPhys;
	if (vec3.dot(norm, self.vel) < 0) // heading torwards entity
	{
		if (ent2 && ent2.type & G.ET_ENEMY)
		{
            
			var xvel = 5.0;
			var yvel = 10.0;
			self.vel[0] = norm[0]*xvel;
			self.vel[1] = norm[1]*yvel;
			self.vel[2] = 0.;

		}
		else
		{
            var bounce;
			// velocity
			if (Math.abs(norm[1]) > 0.5) // slide along floors
                bounce = 1.1;
			else // bounce off walls slightly
                bounce = 1.2;
            //project
            var t = vec3.dot(norm,self.vel)/vec3.sqrLen(norm);
            var v = vec3.create();
            vec3.scale(v, norm, t*bounce);
            vec3.sub(self.vel,self.vel, v); 
			self.vel[2] = 0.;
		}
	}
}

/*
Player.prototype.actionFly = function(kstate, dir)
{
	if (kstate & G.KS_PRESSED)
	{
		Vec3f vel = GetVelocity() + dir*flyAccel;
		var len = vel.Normalize ();
		if (len > maxFlySpeed)
			vel *= maxFlySpeed;
		else vel *= len;
		GetVelocity() = vel;
		mIsMoving = true;
	}
	else if (kstate & G.KS_RELEASED)
		mIsMoving = false;
}
*/

Player.prototype.actionWalk = function(kstate, dir)
{
    var self = this;
    var P = PlayerPhys;
	var s;
	if (kstate & G.KS_PRESSED)
	{
		// ANIMATION
        // walking
		if (self.actor.anim != G.ANIM_WALK && self.isGrounded && !self.isRunning)
		{
            self.actor.setAnim(G.ANIM_WALK);

        }
        // Running
		else if (self.actor.anim != G.ANIM_RUN && self.isGrounded && self.isRunning)
		{
            self.actor.setAnim(G.ANIM_RUN);

        }

        if (self.isRunning)
        {
            var accel,
                max;
            if (self.isGrounded)
            {
                s = 1.0;
                max = P.maxRunSpeed;
            }
            else 
            {
                s = 0.7;
                max = P.maxAirRunSpeed;
            }

            if (self.vel[0]*dir < P.maxWalkSpeed)
                accel = P.runInitAccel;
            else accel = P.runAccel*self.vel[0]/P.maxRunSpeed*dir;
            var v = self.vel[0] + accel*dir*s;
            if (v*dir >= max)
            {
                if (self.vel[0]*self.vel[0] > v*v)
                    self.vel[0] = v;
            }
            else self.vel[0] = v;
        }
        else // walk
        {
            if (self.isGrounded)
                s = 1.0;
            else s = 0.9;
            var v = self.vel[0] + P.walkAccel*dir*s;
            if (v >= P.maxWalkSpeed)
            {
                if (self.vel[0] > v)
                    self.vel[0] = v;
                else if (self.vel[0] < v)
                    self.vel[0] = P.maxWalkSpeed;
            }
            else if (v <= -P.maxWalkSpeed)
            {
                if (self.vel[0] < v)
                    self.vel[0] = v;
                else if (self.vel[0] > v)
                    self.vel[0] = -P.maxWalkSpeed;
            }
            else self.vel[0] = v;
        }
        // move with the down slope
        if (self.isGrounded && self.groundDist < 0.01)
        {
            var n = vec2.clone(self.groundNorm);
            if (n[0] > 0 && n[0] > P.maxSlope[0])
                n = P.maxSlope;
            else if (n[0] < 0 && n[0] < -P.maxSlope[0])
            {
                n[0] = -P.maxSlope[0];
                n[1] = P.maxSlope[1];
            }

            var t = -vec2.dot (n,self.vel);
            if (t < 0.) // down slope
            {
                var vel = [0,0]
                    vec2.add(vel, self.vel,vec2.scale(n,n,t));
                vec2.scale(self.vel, vel, self.vel[0]/vel[0]);
            }
        }
        self.isMoving = true;
        self.orient = dir;
    }
    else if (kstate & G.KS_RELEASED)
    {
        self.isMoving = false;

    }
}

Player.prototype.actionDown = function(kstate)
{
    var self = this;
	if (kstate & G.KS_PRESSED)
		self.isCrouched = true;
	else if (kstate & G.KS_RELEASED)
		self.isCrouched = false;
}

Player.prototype.actionRun = function(kstate)
{
    var self = this;
	if (kstate & G.KS_PRESSED)
	{
		if (self.isRunning == false)
		{
			self.isRunning = true;
			self.runCounter = 1;
		}
		else if (self.runCounter < 100)
			self.runCounter++;
	}
	else if (kstate & G.KS_RELEASED)
	{
		self.isRunning = false;
		self.runCounter = 0;
	}
}

Player.prototype.actionJump = function(kstate)
{
    var self = this;
    var P = PlayerPhys;
	if (kstate & G.KS_PRESSED)
	{
		if (self.isGrounded && self.jumpCounter < 0)
		{
			self.jumpCounter = 0;
			if (self.vel[1] > 0)
				self.vel[1] *= 0.3;
			else if (self.vel[1] < 0.)
				self.vel[1] = 0.;
			self.vel[1] += Math.abs(self.vel[0]*0.3);

		}
		if (self.jumpCounter > -1 && self.jumpCounter < 5)
		{



			var s = 0.2;
			if (self.jumpCounter > 2)
			{
				var jmp = self.jumpCounter-2;
				s = 1.0/jmp*jmp;
			}
			self.vel[1] += P.jumpAccel*s;

		    self.jumpCounter++;
		}
		if (self.jumpCounter >= 5 && self.isGrounded)
			self.jumpCounter = -1;
		// ANIMATION
		if (self.actor.anim != G.ANIM_JUMP_FORWARD && self.isGrounded)
		{	
            self.actor.setAnim(G.ANIM_JUMP_FORWARD);
        }
    }
    else if (kstate & G.KS_RELEASED)
        self.jumpCounter = -1;
}

Player.prototype.actionFire = function(kstate)
{
    var self = this;

    if (!self.client) return; //FIXME create entities locally for non-network play

	if (kstate & G.KS_PRESSED)
	{
		if (!self.fireCounter)
		{
			self.fireCounter=1;
            var b = {
                vel: [0.0,0,0],
                pos: _.clone(self.pos),
                type: G.ET_BULLET
            }
            b.vel[0] *= self.orient;
            //b.vel[0] += self.vel[0];
			if (self.isCrouched) b.pos[1] += -10;
            self.client.bullets.push(b);

		}
	}
	else if (kstate & G.KS_RELEASED)
	{
	    self.fireCounter = 0;
	}
}

Player.prototype.testGround = function()
{
    var self = this;
	var GROUND_TEST_DIST = 5.;
	// check to see if there's ground below
	self.nextPos = vec3.clone(self.pos);
	self.nextPos[1] -= GROUND_TEST_DIST;

	var result = Collision.entityCollisionCheckWorld (self);

	if (result.hasCollided)
	{
		self.isGrounded = true;
		self.groundDist = result.fraction * GROUND_TEST_DIST;
		self.groundNorm = result.normal;
	}
	else self.isGrounded = false;
}


