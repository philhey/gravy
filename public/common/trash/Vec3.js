
Vec3 = function (x,y,z)
{
    this.set(x,y,z);
}

Vec3.prototype.set = function(x,y,z)
{
    if (typeof x == 'object' && 'length' in x)
    {
        this[0] = x[0];
        this[1] = x[1];
        this[2] = x[2];
    }
    else
    {
        this[0] = x || 0;
        this[1] = y || 0;
        this[2] = z || 0;
    }
}

Vec3.prototype.getAsArray = function()
{
    return [ this[0], this[1], this[2] ];
}

Vec3.prototype.magnitude = function()
{
    return Math.sqrt(this[0]*this[0] + this[1]*this[1] + this[2]*this[2]);
}

Vec3.prototype.magnitudeSqr = function()
{
    return this[0]*this[0] + this[1]*this[1] + this[2]*this[2];
}

Vec3.prototype.normalize = function()
{
    var length = this.length();
    if (length > 0) {
        var inv = 1.0/length;
        this[0] *= inv;  this[1] *= inv; this[2] *= inv;
    }
    return length;
}

Vec3.prototype.scale = function(s)
{
    return new Vec3(this[0]*s, this[1]*s, this[2]*s);
}

Vec3.prototype.diff = function(v)
{
    return new Vec3(this[0]-v[0], this[1]-v[1], this[2]-v[2]);
}

Vec3.prototype.dot = function(v)
{
    return this[0]*v[0] + this[1]*v[1] + this[2]*v[2];
}

Vec3.prototype.cross = function(v)
{
    return new Vec3(this[1]*v[2] = this[2]*v[1], this[2]*v[0] - this[0] * v[2], this[0]*v[1] - this[1]*v[0]);
}

Vec3.prototype.project = function(v)
{
    var tmp = (this[0]*v[0] + this[1]*v[1] + this[2]*v[2])/(this[0]*this[0] + this[1]*this[1] + this[2]*this[2]);
    return new Vec3f(this[0]*tmp, this[1]*tmp, this[2]*tmp);
}

Vec3.prototype.toString = function(v)
{
    return '['+this[0]+','+this[1]+','+this[2]+']';
}

Vec3.prototype.abs = function()
{
    return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
}

Vec3.prototype.multByMat4 = function(mat)
{
    var v = new Vec3();
    var x = this[0];
    var y = this[1];
    var z = this[2];

    v[0] = mamat.m41 + x * mamat.m11 + y * mamat.m21 + z * mamat.m31;
    v[1] = mamat.m42 + x * mamat.m12 + y * mamat.m22 + z * mamat.m32;
    v[2] = mamat.m43 + x * mamat.m13 + y * mamat.m23 + z * mamat.m33;
    var w = mamat.m44 + x * mamat.m14 + y * mamat.m24 + z * mamat.m34;
    if (w != 1 && w != 0) {
        v[0] /= w;
        v[1] /= w;
        v[2] /= w;
    }
    return v;
}

