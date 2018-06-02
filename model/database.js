const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// Pull this from our hidden env file.
const mongoDbUrl = process.env.MLAB_URI;


exports.init = function() {

  // If something goes wrong, let's find out.
  mongoose.connection.on('error',function (err) {
    console.log('Mongoose connection error: ' + err);
  });
  
  mongoose.connection.on('disconnected', function () {
    console.log('Mongoose disconnected');
  });
  
  // Set up our callbacks for when the connection is opened.
  mongoose.connection.on('open', function() {
    
    console.log('Mongoose connected.');
    
    // Now that we are connected, make sure 
    // we clean up after ourselves when we die.
    process.on('SIGINT', function() {
      
      mongoose.connection.close(function () {
        console.log('Mongoose disconnected through app termination');
        process.exit(0);
      });
    
    });
  });
  
  // Finally let's actually connect!
  mongoose.connect(mongoDbUrl);
};


// Define the schemas for this application.
const BarUserSchema = new Schema({
  login: { type: String, required: true },
  name:  { type: String, required: true },
  bars: [{
    id: { type: ObjectId, required: true }
  }]
});

const BarSchema = new Schema({
  yelpId:    { type: String, required: true },
  usersGoing: [{
    id: { type: ObjectId, required: true }
  }]
});



BarSchema.statics.getAttendingFromBarList = function (session, callback) {

  console.log("DB getAttendingFromBarList");
  
  // Prep the data
  //  1) Extract the Yelp Ids from the response. 
  //  2) Prefill added fields.
  var queryIDs = [];
  
  session.businesses.forEach(function(element){
    queryIDs.push(element.id);
    element.num_going = 0;
    element.im_going = false;
  });
  
  // Now look for all of the bars Yelp told us about in our DB.
  Bar.find({"yelpId": {$in: queryIDs}}, function(err, dbBars){
    
    if (err) console.log("  find ERROR: " + err);
    
    // For all the bars in our DB
    for (var i = 0; i < dbBars.length; i++) {
      
      // And for all of of the bars Yelp told us about
      for (var j = 0; j < session.businesses.length; j++) {
        
        // If there's a match, 
        if (dbBars[i].yelpId == session.businesses[j].id) {
          
          // Save the number of folks going
          session.businesses[j].num_going = dbBars[i].usersGoing.length;
          
          // And then check to see if we are going
          for (var k = 0; k < dbBars[i].usersGoing.length; k++) {
            if (session._id == dbBars[i].usersGoing[k].id){
              session.businesses[j].im_going = true;
              break;
            }
          }
        }
      }
    }
    
    callback(err, dbBars);
  });
}



BarSchema.statics.toggleAttending = function (yelpId, session, callback) {

  console.log("DB toggleAttending for " + yelpId);

  var business;
  
  // Find the business associated with this YelpID
  for (var j = 0; j < session.businesses.length; j++) {
    if (yelpId == session.businesses[j].id) {
      business = session.businesses[j];
      break;
    }
  }
  
  if (j >= session.businesses.length) {
    console.log("  Ohno! Didn't find a yelpId!!! ");
  }
  
  // Look for the bar of interest
  Bar.findOne({yelpId: yelpId}, function (err, bar) {

    if (err) console.log("  findOne ERROR: " + err);
    
    // If we found it, it's already in the DB and we can work with it.
    if (bar) {
      
      console.log("  Found the bar in the DB");

      var i;
      
      for (i = 0; i < bar.usersGoing.length; i++) {
        if (session._id == bar.usersGoing[i].id){
          bar.usersGoing.splice(i, 1);
          i--;
          business.num_going--;
          business.im_going = false;
          break;
        }
      }
      
      if (i >= bar.usersGoing.length) {
        var newUserGoing = {id: session._id};
        bar.usersGoing.push(newUserGoing);
        business.num_going++;
        business.im_going = true;
      }
      
      bar.save(function (err, bar) {
        if (err) console.log("  save ERROR: " + err);
        callback(err, bar);
      });
      
    }
    // ELse it's not in the DB, so create it and add ourselves to the going list.
    else {
      console.log("  Didn't find the bar in the DB");

      Bar.create({yelpId: yelpId,
                  usersGoing: [{id: session._id}]
                 }, function(err, bar) {
        
        if (err) console.log("  create ERROR: " + err);
        
        business.num_going++;
        business.im_going = true;
        callback(err, bar);
      });
    }
  });
}


// Define the models for this application.
var BarUser = mongoose.model('BarUser', BarUserSchema);
var Bar = mongoose.model('Bar', BarSchema);

// And let's export them.
exports.User = BarUser;
exports.Bar = Bar;



////////////////////////////////////////////////////////////////////////
//
//  DEBUG / TEST CODE
//
////////////////////////////////////////////////////////////////////////
exports.test = function() {

};


