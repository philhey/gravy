

var Collision = {


boxNorms: [[1.0,0.0,0.0],
                [-1.0,0.0,0.0],
                [0.0,1.0,0.0],
                [0.0,-1.0,0.0],
                [0.0,0.0,1.0],
                [0.0,0.0,-1.0]],

triBoxNorms: [
                [0.,0.], // for tri
                [0.,0.], // for tri
                [0.,0.], // for tri
                [1.,0.], // read only
                [0.,1.]], // read only




halfAabbCollisionTriangle: function( aabb, startPos, endPos, tri)
{
    var self = this;
    var epsilon = 0.0;
    var invalid = 1000.0;
    var first=-invalid,last=invalid,
          enter,exit,
        min,max,
        start,end;
    var radius;
    var invdist;
    var result = {};
    result.hasCollided = false;
    result.inside = false;
    result.fraction = 1.0;
    result.normal = [0,0,0];


    self.triBoxNorms[0] = tri.norms[0];
    self.triBoxNorms[1] = tri.norms[1];
    self.triBoxNorms[2] = tri.norms[2];
    var hasCollided = false;
    var norm,
        collNorm;
    var startV = vec2.clone(startPos),
          endV = vec2.clone(endPos);
    // box planes
    for (var i = 0; i < 5; i++)
    {
        enter = -invalid;
        exit = invalid;
        norm = self.triBoxNorms[i];
        min = vec2.dot(norm,tri.p[0]);
        max = min;
        for (var j = 1; j < 3; j++)
        {
            var t  = vec2.dot(norm,tri.p[j]);
            if (t > max)
                max = t;
            else if (t < min)
                min = t;
        }
        var normAbs = [Math.abs(norm[0]),Math.abs(norm[1])];
        radius = vec2.dot(normAbs,aabb.half);
        min -= radius;
        max += radius;

        start = vec2.dot (norm,startV);
        end = vec2.dot (norm,endV);
        invdist = end - start;
        invdist = Math.abs (invdist);
        if (invdist == 0.0)
        {
            invdist = 1.0;
        }
        else invdist = 1.0/invdist;
        
        var ep = Math.abs(epsilon * invdist);
        var Ep = 0.0;
        if (start < min + Ep)
        {
            if (end < min + Ep)
                return result;
            enter = (min - start) * invdist;
            exit = (max - start) * invdist;

            if (enter < 0.) enter = -enter;
            enter -= ep;
        }
        else if (start > max - Ep)
        {
            if (end > max - Ep)
                return result;
            enter = (start - max) * invdist;
            exit = (min - start) * invdist;

            if (enter < 0.) enter = -enter;
            enter -= ep;
        }
        else if (start < max && end > max)
                exit = (max - start) * invdist;
        else if (start > min && end < min)
                exit = (min - start) * invdist;

        else
            continue;
        
        if (exit < 0.) exit = -exit;
        exit -= ep;
        if (enter > first)
        {
            first = enter;
            collNorm = norm;
            hasCollided = true;
        }
        if (exit < last)
            last = exit;

    }

    if (last < first)
        return result;

    if (hasCollided)
    {
        result.fraction = first;
        result.normal = [collNorm[0], collNorm[1], 0];
    }
    else return result;
    // flip normal
    dir = vec2.sub(vec2.create(), startPos, endPos);
    if (vec2.dot(result.normal, dir) < 0)
        vec2.mul(result.normal,result.normal, [-1,-1]);
    result.hasCollided = true;
    return result;
},

halfAabbCollisionHalfAabb: function(aabb1, startPos, endPos, aabb2, pos2)
{
    var self = this;
    var epsilon = 0.0;
    var invalid = 1000.0;
    var first=-invalid,last=invalid,
          enter,exit, pos, min, max,
        start,end;
    var radius;
    var invdist;
    var result = {};
    result.hasCollided = false;
    result.inside = false;
    result.fraction = 1.0;
    result.normal = [0,0,0];


    var hasCollided = false;
    var norm,collNorm;
    var startV = vec2.clone(startPos),
          endV = vec2.clone(endPos);
    var inside=true;
    // box planes
    for (var i = 3; i < 5; i++)
    {
        enter = -invalid;
        exit = invalid;
        norm = self.triBoxNorms[i];
        var normAbs = [Math.abs(norm[0]), Math.abs(norm[1])];
        radius = vec2.dot(normAbs,aabb1.half) + vec2.dot(normAbs,aabb2.half);
        pos = vec2.dot(norm,pos2);
        min = pos - radius;
        max = pos + radius;

        start = vec2.dot(norm,startV);
        end = vec2.dot(norm,endV);
        invdist = end - start;
        invdist = Math.abs(invdist);
        if (invdist == 0.0)
        {
            invdist = 1.0;
        }
        else invdist = 1.0/invdist;
        
        var ep = Math.abs(epsilon * invdist);
        var Ep = 0.0;
        if (start < min + Ep)
        {
            if (end < min + Ep)
                return result;
            enter = (min - start) * invdist;
            exit = (max - start) * invdist;

            if (enter < 0.) enter = -enter;
            enter -= ep;
            inside = false;
        }
        else if (start > max - Ep)
        {
            if (end > max - Ep)
                return result;
            enter = (start - max) * invdist;
            exit = (min - start) * invdist;

            if (enter < 0.) enter = -enter;
            enter -= ep;

            inside = false;
        }
        else if (start < max && end > max)
                exit = (max - start) * invdist;
        else if (start > min && end < min)
                exit = (min - start) * invdist;

        else
            continue;
        

        if (exit < 0.) exit = -exit;
        exit -= ep;
        if (enter > first)
        {
            first = enter;
            collNorm = norm;
            hasCollided = true;
        }
        if (exit < last)
            last = exit;

    }
    if (last < first)
        return result;

    if (hasCollided)
    {
        result.fraction = first;
        result.normal = [collNorm[0], collNorm[1], 0];
    }
    else return result;
    // flip normal
    dir = vec2.sub(vec2.create(), startPos, endPos);
    if (vec2.dot(result.normal, dir) < 0)
        vec2.mul(result.normal,result.normal, [-1,-1]);
    result.hasCollided = true;
    return result;
},

entityCollisionCheckWorld: function (ent1)
{
    var self = this;

    var map = G.map;
    var result = { };
    _.each(G.entities, function(e) {
    
        if (!e.used) //was e.dead
            e.cdone = true;
        else if (e.bounds.type != G.BT_AABB)
            e.cdone = true;
        else e.cdone = false;
    
        e.cres = {};
        e.cres.fraction = 1000.;
        e.cres.hasCollided = false;
        e.ccheck=false;
        e.ccycle=0;
    });
    
    result.hasCollided = false;
    result.fraction = 1000.;
    _.each(G.entities, function(ent2)
    {
        if (ent2 == ent1 || ent2.cdone)//  || ent2->ccycle > cycle)
            return;
        var end;
        end = vec3.clone(ent1.nextPos);

        var res = self.halfAabbCollisionHalfAabb (ent1.bounds, ent1.pos, end, ent2.bounds, ent2.pos);
        if (res.hasCollided && res.fraction < result.fraction)
        {
            result = res;
            result.ent = ent2;

        }
    });
    // TEST MAP
    var res = map.collisionCheck (ent1);
    if (res.hasCollided && res.fraction < result.fraction)
    {
        result = res;
        res.ent = null;
    }

    if (!result.hasCollided) result.fraction = 1.;

    return result;

},

entityCollisionCheckMap: function (ent)
{
    return G.map.collisionCheck (ent);
},

collisionCheckWorld: function ()
{
    var self = this;
    var i;
    _.each(G.entities, function(ent)
    {

        if (!ent.used) //was ent.dead
            ent.cdone = true;
        else if (!ent.bounds || ent.bounds.type != G.BT_AABB)
            ent.cdone = true;
        else ent.cdone = false;
        
        ent.cres = {};
        ent.cres.fraction = 1000.;
        ent.cres.hasCollided = false;
        ent.ccheck=false;
        ent.ccycle=0;
        ent.ctime=1;

    });
    var ent1,
        cent1,cent2;
    var result = {};
    result.fraction = 1000.;
    cent1 = cent2 = null;
    i=4;
    var cycle = 0;
    var e = 0;
    ent1 = G.entities[e];
    while (1)
    {
        if (!ent1)
        {
            i--;
            if (!i) break;

            cycle++;
            e=0;
            ent1 = G.entities[e];
        }
        if (ent1.cdone || ent1.ctime < 0.1 || vec2.dot(ent1.vel,ent1.vel) == 0.0)
        {
            e++;
            ent1 = G.entities[e];
            continue;
        }
        ent1.ccycle++;
        result.fraction = 1000.;
        result.hasCollided = false;
        result.ent = null;
        // TEST OTHER ENTITIES
        _.each(G.entities, function(ent2) 
        {
            if (ent2 == ent1 || ent2.owner == ent1  || ent1.owner == ent2 || ent2.cdone)//  || ent2->ccycle > cycle)
                return;

            var end = vec3.clone(ent1.nextPos);
           
            //console.log('testing collision: ' + ent1.entID + ' ' + ent2.entID);
            var res = self.halfAabbCollisionHalfAabb (ent1.bounds, ent1.pos, end, ent2.bounds, ent2.pos);
            if (res.hasCollided && res.fraction < result.fraction)
            {
            //console.log('collision: ' + ent1.entID + ' ' + ent2.entID);
                result = res;
                result.ent = ent2;

            }
        });
        // TEST MAP
        if (G.map)
        {
            var res = G.map.collisionCheck (ent1);
            if (res.hasCollided && res.fraction < result.fraction)
             {
                result = res;
                result.ent = null;
             }
        }

        if (result.hasCollided)
        {

            var epsilon = .03;
            var norm = result.normal;
            var dir = vec2.sub(vec2.create(), ent1.nextPos, ent1.pos)
            var dist = Math.abs(vec2.dot(norm, dir));
            var invdist;
            if (dist == 0.0)
                invdist = 1;
            else invdist = 1./dist;
            var ep = Math.abs(epsilon * invdist);
            result.fraction = result.fraction - ep;
            if (result.fraction < 0.0) result.fraction = 0.;
            
            // MOVE ENTITY
            var dir = vec2.sub(vec2.create(), ent1.nextPos, ent1.pos)
            vec2.scale(dir, dir, result.fraction);
            vec2.add(ent1.pos, ent1.pos, dir);
        }
        else // move all the way
        {  
            result.fraction = 1.;
            // MOVE ENTITY
            vec2.copy(ent1.pos, ent1.nextPos);
        }
        
        ent1.ctime -= result.fraction;



        // ALLOW ENTITY TO RESPOND TO COLLISION
        if (result.hasCollided)
        {
            // next 3 lines added for server temporary?
            ent1.cres.hasCollided = true;
            if (result.ent)
                result.ent.cres.hasCollided = true;

            var vel1 = vec3.clone(ent1.vel);
            if (ent1.handleCollision)
                ent1.handleCollision (result.ent, result.normal);
            var vel2 = vec3.clone(ent1.vel);
            ent1.vel = vel1; // allow entity to respond to impact velocity
            if (result.ent && result.ent.handleCollision)
                result.ent.handleCollision (ent1, vec2.mul(result.normal, result.normal, [-1,-1])); //flip normal
            // set back to new velocity
            ent1.vel = vel2;

            if (result.ent){
                var dir = [0,0];
                vec2.scale(dir, result.ent.vel, result.ent.ctime);
                vec2.add(result.ent.nextPos, result.ent.pos, dir);
            }
        }
        // COMPUTE NEXT POSITION
        var dir = [0,0];
        vec2.scale(dir, ent1.vel, ent1.ctime);
        vec2.add(ent1.nextPos, ent1.pos, dir);

        e++;
        ent1 = G.entities[e];
    }
}

};

// for nodejs
if (typeof module !== 'undefined' && module.exports)
{
    var _ = require('underscore');
    var glMat = require('gl-matrix');
    var vec2 = glMat.vec2;
    var vec3 = glMat.vec3;
    
    var G = global.G;
    module.exports = Collision;
}
