



var gameRunning = false;


function Client()
{
    this.camera = new Camera();
    this.bullets = []; //i.e. new bullets to send to the server
}

Client.prototype.focusCamera = function(entity)
{
    var self = this;
    var ent = typeof entity !== 'undefined' ? entity : self.ent
    cmat = self.camera.mat;
    cmat[12] = ent.pos[0];
    cmat[13] = ent.pos[1];

}

Client.prototype.connect = function(url)
{
    var self = this;

    function createEnt(src)
    {
        //console.log(src.type + ' player: ' + G.ET_PLAYER);
        if (src.type & G.ET_PLAYER)
        {
            G.entities[src.entID] = new Player(G.NR_NETWORK);
            
        }
        else
        {
            G.entities[src.entID] = new Entity();
            if(src.bounds)
                G.entities[src.entID].bounds = src.bounds;
        }
        var ent = G.entities[src.entID];
        ent.used = true;
        ent.netIn.copy(src);
        ent.netIn.writeToEntity(ent)
        ent.type = src.type;
        ent.netOut.copy(ent.netIn);

        return ent;
    }
    self.socket = io.connect(url);
    self.socket.on('join-game', function (data) {
            var ent = createEnt(data.ent);
            self.ent = ent;
            ent.client = self;
            ent.used = true;
            self.sockID = data.sockID;
            ent.netRole = G.NR_LOCAL;
            /*
            if(data.entities.length)
            _.each(data.entities, function(e){
                if (e.entID >= 0)
                createEnt(e); 
                });
            */
            //LOAD MAP
            var map = new Map();
            map.load(gl,"./public/levels/" + data.map + '.lvl', function(err){
                if (!err)
                G.map = map;
                else console.error(err);
                // place player at start pos
                if (G.map.startPos.length)
                    self.ent.pos = G.map.startPos[0].pos;
                self.ent.netIn.readFromEntity(self.ent);
                
                //run the game loop
                G.main(gl);

                });


    });
    self.socket.on('new-player', function (data) {
            var ent = createEnt(data.entity);
            ent.netIn.flags = G.ES_CHANGED;
            });
    self.socket.on('game-cycle', function (ents) {
            _.each(ents, function(e) {
                if (e.entID >= 0) {
                    var ent = G.entities[e.entID];
                    if (!ent.used){ //new entity
                        ent = createEnt(e);
                        ent.netIn.flags = G.ES_CHANGED;
                    }
                    else{
                        var nent = G.entities[e.entID].netIn;
                        nent.flags = G.ES_CHANGED; //A MUST or entity will not be updated
                        nent.copy(e);
                    }
                }   
                else { // delete entity (negative id means entity is dead)
                    var ent = G.entities[(-e.entID)-1];
                        ent.used = false;
                }
            });
    });


};

Client.prototype.sendStatus = function()
{
    var self = this;
    

    if (!self.ent) return;

    //first copy new data from associated entity
    var nent = self.ent.netOut;
    nent.readFromEntity(self.ent);
    var stat = {
        sockID: self.sockID, 
        ent: nent,
        time: G.netTime
    };
    if (this.bullets.length){
        stat.bullets = _.clone(this.bullets);
        this.bullets = [];
    }
     
        
    self.socket.emit('client-status', stat);
};

Client.prototype.handleUserInput = function()
{
    var self = this;
	for (var i = 0; i < PlayerActions.length; i++)
	{
		var state = G.keys[PlayerActions[i].key].state;
        PlayerActions[i].action(self.ent, state);
	}
}



