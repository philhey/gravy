    
precision mediump float;

uniform sampler2D sampler2d;

varying vec2 v_texCoord;
varying vec4 v_color;


void main()
{
    vec2 texCoord = vec2(v_texCoord.s,  1.+v_texCoord.t);
    vec4 color = texture2D(sampler2d, texCoord);
    color *= v_color;
    //color += vec4(0.1, 0.1, 0.1, 1);
    gl_FragColor = vec4(color.rgb, color.a);
}

