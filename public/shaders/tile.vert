
uniform mat4 u_modVProjMat;
uniform vec3 u_translate;
uniform vec4 u_color;

//do change the order of the attribute variables (determines attibute location, gl.bindAttribLocation)
attribute vec4 vPosition;
attribute vec2 vTexCoord;

varying vec2 v_texCoord;
varying vec4 v_color;

void main()
{
    vec4 pos = vPosition + vec4(u_translate.xyz, 0.);
    gl_Position = u_modVProjMat * pos;
    v_texCoord = vTexCoord.st;
    v_color = u_color;
}

