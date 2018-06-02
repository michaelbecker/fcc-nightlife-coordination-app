const db = require("../model/database.js");
const request = require("request");
const querystring = require("querystring");
const randomString = require("randomstring");


//////////////////////////////////////////////////////////////////////////////
// 
//  ROUTE:  /user/login
//
//////////////////////////////////////////////////////////////////////////////
exports.login = function(req, res) {

  req.session.githubLoginStateString = randomString.generate();
  
  var url = "https://github.com/login/oauth/authorize"
            + "?client_id=" + process.env.GITHUB_OAUTH_CLIENT_ID
            + "&state=" + req.session.githubLoginStateString
            + "&redirect_uri=" + process.env.HOST + "/user/authorization_callback";
  
  res.redirect(url);
};


//////////////////////////////////////////////////////////////////////////////
// 
//  ROUTE:  /user/authorization_callback
//
//  REFERENCE:
//  http://shiya.io/how-to-do-3-legged-oauth-with-github-a-general-guide-by-example-with-node-js/  
//
//////////////////////////////////////////////////////////////////////////////
exports.authorizationCallback = function(req, res) {
  
  if (req.query.state != req.session.githubLoginStateString) {
    console.log("Possible cross-site request forgery attack!");
    // TODO - warning landing page!
    res.redirect('/');
    return;
  }
  
  request.post( {
    url: "https://github.com/login/oauth/access_token?" 
          + "client_id=" + process.env.GITHUB_OAUTH_CLIENT_ID
          + "&client_secret=" + process.env.GITHUB_OAUTH_CLIENT_SECRET
          + "&code=" + req.query.code
    }, function (error, response, body) {
        req.session.access_token = querystring.parse(body).access_token;
    
        request.get( {
          url: "https://api.github.com/user?" 
                + "access_token=" + req.session.access_token,
          headers: {'User-Agent': "FreeCodeCamp Voting App" }      
          }, function (error, response, body) {

              var info = JSON.parse(body);
              req.session.login = info.login;
              req.session.name = info.name;

              db.User.findOne({login: req.session.login}, function(err, user) {

                // This is a new user logging in. Add them to the DB.
                if (!user) {
                  db.User.create({login: req.session.login, 
                                  name: req.session.name},
                    function(err, user) {
                      req.session._id = user._id;
                      res.redirect('/');
                  });
                }
                // Else we are just looking them up
                else {
                  req.session._id = user._id;
                  res.redirect('/');
                }
              });
          });
    
    });
}


//////////////////////////////////////////////////////////////////////////////
// 
//  ROUTE:  /user/logout
//
//////////////////////////////////////////////////////////////////////////////
exports.logout = function(req, res) {

  req.session.destroy(function(err) {
    if (err) console.log("Failed destroying session? " + err);
  });

  res.redirect(process.env.HOST);
};


