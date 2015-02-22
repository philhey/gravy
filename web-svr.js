var express = require('express')
    , app = express()
    , db = require('./config/dbschema')
    , pass = require('./config/pass')
    , passport = require('passport')
    , basic_routes = require('./routes/basic')
    , user_routes = require('./routes/user')
    , server = require('http').Server(app)
    , bodyParser = require('body-parser')
    , multer = require('multer')
    , io = require('socket.io').listen(server);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
//app.use(express.logger());
//app.use(express.cookieParser());
//app.use(express.bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true }));
app.use(multer());
//app.use(express.methodOverride());

// use express.session before passport, so that passport session will work
//app.use(express.session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
// clearly denote public content
app.use('/public', express.static('public'));

// set up our security to be enforced on all requests to secure paths
app.all('/secure', pass.ensureAuthenticated);
app.all('/secure/admin', pass.ensureAdmin);

app.get('/', function(req,res){
    res.redirect('/lobby');
});
// Basic pages
//app.get('/', basic_routes.index);

//app.get('/lobby', basic_routes.lobby);




// Login pages
app.get('/dmz/login', user_routes.getlogin);
app.post('/dmz/login', user_routes.postlogin);
app.get('/dmz/logout', user_routes.logout);

// secure pages
app.get('/secure/account', user_routes.account);
app.post('/secure/sendEmail',user_routes.sendEmail);

//admin pages
app.get('/secure/admin', user_routes.admin);

var gameLobby = require('./web-svr/game-lobby')(app);
//app.post('/game',basic_routes.game);

var port = 8000;
server.listen(port);
/*app.listen(port ,function(){
    console.log("listening on port: " + port);
});*/

