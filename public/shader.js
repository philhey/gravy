
G.shaders = {};
function loadShader(gl, name, callback)
{
    
    if (G.shaders[name])
        return G.shaders[name];

    G.shaders[name] = new Shader()
    var url = "./public/shaders/" + name;
    G.shaders[name].init(gl, url + '.vert',url + '.frag', function(){
        callback(G.shaders[name]);
    });
}

function Shader()
{
    //for storing uniform locations from glsl prog
    this.V = {};

    //used in creating the shader
    this.attribs = [];

}

Shader.prototype.init = function(gl, vshader, fshader, callback)
{
    var self = this;
    // create our shaders
    async.parallel([
        function(callback)
        {
                self.loadShader(gl, vshader, function(shdr){
                callback(null, shdr)
                });
        },
        function(callback)
        {
            self.loadShader(gl, fshader, function(shdr){
                callback(null,shdr)
                });
        }],
        function(err, shdrs)
        {


        // Create the program object
        var program = gl.createProgram();

        // Attach our two shaders to the program
        gl.attachShader (program, shdrs[0]);
        gl.attachShader (program, shdrs[1]);

        // Bind attributes
        for (var i = 0; i < self.attribs.length; ++i)
            gl.bindAttribLocation (program, i, self.attribs[i]);

        // Link the program
        gl.linkProgram(program);

        // Check the link status
        var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked && !gl.isContextLost()) {
            // something went wrong with the link
            var error = gl.getProgramInfoLog (program);
            log("Error in program linking:"+error);

            gl.deleteProgram(program);
            gl.deleteProgram(fragmentShader);
            gl.deleteProgram(vertexShader);

            return null;
        }
        //locate uniform varables
        for (var name in self.V){
            self.V[name] = gl.getUniformLocation(program, name);
        }

        self.prog = program
        callback();
        });
}

Shader.prototype.loadShader = function(gl, fd, callback)
{
    var self = this;
    var ext = fd.split('.').pop();
    if (ext == "vert")
        var shaderType = gl.VERTEX_SHADER;
    else if (ext == "frag")
        var shaderType = gl.FRAGMENT_SHADER;
    else {
        log("*** Error: shader script '"+fd+"' of undefined type (not '.vert or '.frag')");
        return null;
    }

    $.ajax({url:fd, async:true}).done( function(text)
            {

            // Create the shader object
            var shader = gl.createShader(shaderType);

            // Load the shader source
            gl.shaderSource(shader, text);

            // Compile the shader
            gl.compileShader(shader);

            // Check the compile status
            var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!compiled && !gl.isContextLost()) {
            // Something went wrong during compilation; get the error
            var error = gl.getShaderInfoLog(shader);
            console.error("*** Error compiling shader '"+fd+"':"+error);
            gl.deleteShader(shader);
            return null;
            }
            
            if (shaderType == gl.VERTEX_SHADER)
            {
                //find uniform & attribute variables
                var lines = text.split(';')
                    _.each(lines, function(line){

                        if (line.search('uniform') > -1)
                        {
                            var vname = line.trim().split(' ').pop().trim();
                            self.V[vname] = null;
                        }
                        else if (line.search('attribute') > -1)
                        {
                            var vname = line.trim().split(' ').pop().trim();
                            self.attribs.push(vname);
                        }

                      });
            }
            callback(shader);
       });
}
