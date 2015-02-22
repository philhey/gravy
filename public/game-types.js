
var GameTypes = {
//collision bounds types
    BT_INVALID: 0,
    BT_AABB: 1,
    BT_SPHERE: 2,

//entity types
    ET_INVALID: 0,
    ET_MAP: 1,
    ET_PLAYER: 1<<1,
    ET_ENEMY: 1<<2,
    ET_BULLET: 1<<3,
    ET_SHELL: 1<<4,
    ET_START: 1<<5,
    ET_ALL: 0xFFFFFFFF,
//animation
    ANIM_NONE: 0,
    ANIM_IDLE : 1,
    ANIM_WALK : 2,
    ANIM_RUN : 3,
    ANIM_JUMP_UP : 4,
    ANIM_JUMP_FORWARD : 5,
    ANIM_JUMP_FORWARD_IDLE : 6,
    ANIM_FALL_FORWARD : 7,
    ANIM_BREAK : 8,


// entity states
    ES_NONE: 0,
    ES_ALIVE: 1,
    ES_CHANGED: 1<<1,
    ES_ALL: 0xFFFFFFFF,

    MAX_ENTITIES: 200,

//network role
    NR_SERVER: 0,
    NR_CLIENT: 1,
    NR_LOCAL: 2,
    NR_NETWORK: 3,

//change cause
    CC_NONE: 0,
    CC_SERVER: -1,
    CC_CLIENT: -2

};
// for nodejs
if (typeof module !== 'undefined' && module.exports)
{
    module.exports.types = GameTypes;
}
else 
{ //commonJS
    if (!G) this.G = {};
    _.extend(G, GameTypes);
}
