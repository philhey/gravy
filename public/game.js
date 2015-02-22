
G.debug = {};

G.PHYSICS_FPS = 60;
G.PHYSICS_FRAME_LEN = 1000.0/G.PHYSICS_FPS

function init(callback)
{
    var canvas = document.getElementById("game-view");
    gl = WebGLUtils.setupWebGL(canvas,{alpha: false});

    if (!gl) {
        return;
    }
    async.parallel([
        //load shaders
        function(callback)
        {
                loadShader(gl, "simple", function(shdr){
                    gl.useProgram(shdr.prog);
                    callback()
                });
        },
        function(callback){
                // the shader used for drawing the tiles
                loadShader(gl, "tile", function(shdr){
                    gl.useProgram(shdr.prog);
                    // Set some uniform variables for the shaders
                    gl.uniform1i(G.shaders.tile.V.sampler2d, 0);
                    callback()
                });
        },/*
        function(callback)
        {
            //get map from address parameters ?lvl=Example
            var levName = getUrlParam('lvl');
            if (!levName){
                //put default level in url
                window.location.replace(window.location.href.split('?')[0] + '?lvl=TurtlePark');
                return;
            }
            G.map = new Map();
            G.map.load(gl,"./public/levels/" + levName + '.lvl', function(){
                    callback() });
        },
        */
        function(callback)
        {
            //Load sprites
            loadSprites(gl, function(){
                    callback();
                });

        }
        ],
        function(err)
        {


        gl.clearColor(0.3, 0.6, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.depthFunc(gl.LESS);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        // Create a box. On return 'gl' contains a 'box' property with
        // the BufferObjects containing the arrays for vertices,
        // normals, texture coords, and indices.
        //G.box = makeBox(gl);


        // Load an image to use. Returns a WebGLTexture object
        //  spiritTexture = loadImageTexture(gl, "./public/images/pirate.png");

        G.client = new Client();

        G.entities = [];
        for (var i=0; i<G.MAX_ENTITIES; i++)
        {
            var ent = new Entity();
            ent.entID = i;
            G.entities.push(ent);
        };

        //get hostname and port for socket.io
        var url = window.location.href
        var arr = url.split("/");

        //calls G.main() upon connection
        G.client.connect(arr[2]);




        if (callback)
            callback();

        });
}


function reshape(gl)
{
    // change the size of the canvas's backing store to match the size it is displayed.
    var canvas = document.getElementById('game-view');
    if (canvas.clientWidth == canvas.width && canvas.clientHeight == canvas.height)
        return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Set the viewport and projection matrix for the scene
    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

    var w = canvas.width;
    var h = canvas.height;
    var cam = G.client.camera;
    cam.setProjection(w,h, 50);

    var cotan = cam.projMat[0];
    mat4.identity(cam.mat);
    mat4.translate(cam.mat,cam.mat, [w*0.5, -h*0.5, cotan*w*0.5]);
    
}

function drawPicture(gl)
{
    G.client.focusCamera();

    // Make sure the canvas is sized correctly.
    reshape(gl);

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    G.map.render(gl,G.client.camera);

    //debug
    if (G.debug.ctri && (G.showMask || 0)) //draw collided triangle
    {
        G.renderer.setShader(gl,G.shaders.simple);
          
        gl.disableVertexAttribArray(1);
        gl.uniform3f(G.shaders.simple.V.u_color, 1, 0, 0);
        gl.uniform3f(G.shaders.simple.V.u_translate, 0,0,1);
        G.renderer.draw2dTris(gl, G.debug.ctri.p);
        gl.enableVertexAttribArray(1);

    }


}

var requestId;

function start()
{
    var c = document.getElementById("game-view");

    //c = WebGLDebugUtils.makeLostContextSimulatingCanvas(c);
    // tell the simulator when to lose context.
    //c.loseContextInNCalls(1);

    c.addEventListener('webglcontextlost', handleContextLost, false);
    c.addEventListener('webglcontextrestored', handleContextRestored, false);

    G.netRole = G.NR_CLIENT;

    G.pause = false;
    // GAME LOOP
    G.main = function(gl)
    {
        if (G.pause || !G.map) return;
        var startTime = new Date().getTime();

        //update from network
        for (var i=0; i < G.entities.length; i++)
        {
            var e = G.entities[i];
            if (e.used==true && e.netIn.flags & G.ES_CHANGED){
                e.netIn.writeToEntity(e);
                e.nextPos = vec3.clone(e.netIn.pos);
                e.netIn.flags = G.ES_NONE;
             }
        }

        //Handle key presses
        G.client.handleUserInput();

        //compute next positions of all entities
        G.map.update();
        //see if we can move to these new positions
        Collision.collisionCheckWorld();

        G.clearReleasedKeys();

        drawPicture(gl);


        var endTime = new Date().getTime();

        G.netTime = endTime // for network
        G.client.sendStatus();

        var totalTime = endTime - startTime;
        var wait = Math.max(G.PHYSICS_FRAME_LEN - totalTime, 10);

        //done...repeat
        setTimeout(function(){ G.main(gl); }, wait);

        //requestId = window.requestAnimFrame(G.main, c);
    };

    init();

    function handleContextLost(e) {
        e.preventDefault();
        clearLoadingImages();
        if (requestId !== undefined) {
            window.cancelAnimFrame(requestId);
            requestId = undefined;
        }
    }

    function handleContextRestored() {
        init(G.main);
    }
}

function getUrlParam(name)
{
    var url = window.location.search.substring(1);
    var params = url.split('&');
    for (var i=0; i < params.length; i++)
    {
        var pair = params[i].split('=');
        if (pair[0] == name)
        {
            return pair[1];
        }
    }
}

function showMask() {
    G.showMask = !G.showMask;
}

// misc jquery

//pause
$(document).ready(function() {
    $("body").keydown(function(event) {
        if (event.keyCode == 19)
        {
            G.pause = !G.pause;
            if (!G.pause)
                G.main();
        }
     });
});

