Camera = function()
{
    this.mat = mat4.create();
    this.projMat = mat4.create();
}

Camera.prototype.setProjection = function(w, h,fov)
{
    var radfov = fov/180.0 * Math.PI;
    var cotan = 1.0/Math.tan(radfov * 0.5);
    mat4.identity(this.projMat)
    this.projMat[0] = cotan;
    this.projMat[5] = cotan * w/h;
    this.projMat[10] = -1.0;
    this.projMat[14] = -cotan;
    this.projMat[11] = -1.0;
    this.projMat[15] = 0;
}
Camera.prototype.getDrawScale = function(z)
{
    var ret = [0,0];
    var tmp = [1.0,1.0,z - this.mat[14],1.0];
    //console.log(tmp);
    vec4.transformMat4(tmp,tmp,this.projMat);
    ret[0] = tmp[0];
    ret[1] = tmp[1];
    if (tmp[3] !== 0)
    {
        ret[0] /= tmp[3];
        ret[1] /= tmp[3];
    }
    return ret;

}

Camera.prototype.getPosition = function()
{
    return [this.mat[12], this.mat[13], this.mat[14]];
}

