
// for nodejs
if (typeof module !== 'undefined' && module.exports)
{
    var G = global.G;
}



G.NUM_KEYS = 512

//KEY STATE
G.KS_NONE = 0,
    G.KS_PRESSED = 1,
    G.KS_RELEASED = 2

    G.keys = [];
    for (var i=0; i < G.NUM_KEYS; i++)
    G.keys.push({ state: G.KS_NONE });

    G.KEY_NAME = {
        backspace: 8,
        enter: 13,
        space: 32,
        tab: 9,
        up: 38,
        down: 40,
        right: 39,
        left: 37,
        shift: 16,
        ctrl: 17,
        alt: 18,
        a: 65,
        b: 66,
        c: 67,
        d: 68,
        e: 69,
        f: 70,
        g: 71,
        h: 72,
        i: 73,
        j: 74,
        k: 75,
        l: 76,
        m: 77,
        n: 78,
        o: 79,
        p: 80,
        e: 81,
        r: 82,
        s: 83,
        t: 84,
        u: 85,
        v: 86,
        w: 87,
        x: 88,
        y: 89,
        z: 90
    };

G.clearReleasedKeys = function()
{
    for (var i=0; i < G.NUM_KEYS; i++){
        var k = G.keys[i];
        if (k.state === G.KS_RELEASED)
            k.state = G.KS_NONE;
    };
}

G.onKeyDown = function(e)
{
    G.keys[e.keyCode].state = G.KS_PRESSED;
}   

G.onKeyUp = function(e)
{
    G.keys[e.keyCode].state = G.KS_RELEASED; 
}



