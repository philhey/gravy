
uniform mat4 u_modVProjMat;
uniform vec3 u_translate;
uniform vec3 u_color;

attribute vec4 vPosition;

varying vec3 v_color;

void main()
{
    vec4 pos = vPosition + vec4(u_translate.xyz, 0.);
    gl_Position = u_modVProjMat * pos;
    v_color = u_color;
}

