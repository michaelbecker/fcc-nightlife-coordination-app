const db = require("../model/database.js");
const yelp = require("yelp-fusion");
const yelpClient = yelp.client(process.env.YELP_API_KEY);


// Helper function
function isLoggedIn(session) {

  if (session && session.access_token && session.login) {
    return true;
  }
  else {
    return false;
  }
}


//////////////////////////////////////////////////////////////////////////////
// 
//  ROUTE:  GET /
//
// Initial landing page
//
//////////////////////////////////////////////////////////////////////////////
exports.showMainPage = function(req, res) {

  console.log("GET request");

  // This is a special case, we need to fix up the session data
  // to make this seemless to the end user.
  if (req.session.delayedYelpId) {
    
      // Record the change in atendence now that we are logged in.
      db.Bar.toggleAttending(req.session.delayedYelpId, req.session, function(err, bar) {
        
        // Clear out the flag
        req.session.delayedYelpId = null;
        
        // And re-query the DB so the data steuctures are valid again.
        db.Bar.getAttendingFromBarList(req.session, function(err, docs) {
          res.render('main_page', { session: req.session,
                                    loggedin: isLoggedIn(req.session) 
                                });
        });
      });
  }
  else {

    res.render('main_page', {session: req.session,
                             loggedin: isLoggedIn(req.session) 
                            });
  }
}


//////////////////////////////////////////////////////////////////////////////
// 
//  ROUTE:  POST /
//
// Form return for querying bar locations
//
//////////////////////////////////////////////////////////////////////////////
exports.getBars = function(req, res) {

  // If the POST contains a location, look up the area bars.
  if (req.body.location) {
  
    console.log("POST Location request: " + req.body.location);
    
    /* THIS WORKS BEAUTIFULLY! */
    yelpClient.search( {location: req.body.location,
                        categories: "bars"
    }).then( function(response) {
      
      // Save the yelp data in the session.
      req.session.businesses = response.jsonBody.businesses;
      
      // This function has side effects! It adds elements to the businesses array!
      db.Bar.getAttendingFromBarList(req.session, function(err, docs) {
        res.render('main_page', { session: req.session,
                                  loggedin: isLoggedIn(req.session) 
                              });
      });
      
    });
  }
  // ELse if the POST contains a YelpID, toggle our attendenance.
  else if (req.body.yelpId) {
    
    console.log("POST YelpId request: " + req.body.yelpId);

    if (isLoggedIn(req.session)) {
      
      db.Bar.toggleAttending(req.body.yelpId, req.session, function(err, bar) {
        res.render('main_page', { session: req.session,
                                  loggedin: isLoggedIn(req.session) 
                              });
      });
    }
    else {
      // If we need to login, remember that we were toggling our attendence,
      // so we can actually finish the operation once we've logged in.
      req.session.delayedYelpId = req.body.yelpId;
      res.redirect("/user/login");
    }
  }
  else {
    console.log("POST Unknown request!");
  }
}




