
exports.index = function(req, res) {
  res.render('index', { user: req.user });
};

/*
exports.lobby = function(req, res) {
  //res.render('lobby', { user: req.user });
  res.sendFile('public/lobby.html');
};
*/


