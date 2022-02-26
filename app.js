require('dotenv').config();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const express = require("express");
const ejs = require("ejs")
const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
require('https').globalAgent.options.rejectUnauthorized = false;
// const mongoStore = require("connect-mongo");

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended : true}));
app.set('view engine', 'ejs')

app.use(session({
  secret : process.env.SECRET,
  resave : false,
  saveUninitialized : false,
  // store: mongoStore.create({
  //   mongoUrl: process.env.PASS
  // })
}));

app.use(passport.initialize()); 
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/CS")//, {useNewUrlParser: true,useUnifiedTopology: true,}); //Running on localhost
// mongoose.connect(String(process.env.PASS),{ useNewUrlParser: true , useUnifiedTopology: true}); // Running on a remote server


/////////       Schema Creation       //////////
const userSchema = new mongoose.Schema({
  username :{type:String, unique :true},
  name : String,
  pic : String,
  email : String
});

userSchema.plugin(passportLocalMongoose,{
usernameField : "username"
});
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy())

////////  Creating sessions and serializing   //////////
passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
  done(err, user);
});
});

////////Google OAuth 2.0 Strategy/////////
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  // callbackURL: "https://community-scrapeyard.herokuapp.com/auth/google/CS",
  callbackURL: "http://localhost:8080/auth/google/CS",
  userProfileUrl : "https://www.googleapis.com.oauth2.v3.userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ username: profile.id},
      {
          name : profile._json.name,
          pic : profile._json.picture,
          email: profile._json.email
      }, 
      function (err, user) {
      console.log(profile.displayName);
    return cb(err, user);
  });
}
));


// ///////////////////////////////////////////////
// /////////// Get Routes ////////////////////////
// ///////////////////////////////////////////////


//////        Google Authentication       /////////
app.get('/auth/google', passport.authenticate('google', {
  scope : ['profile','email']
}));

app.get('/auth/google/CS', 
passport.authenticate('google', { failureRedirect: '/' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/account');
});


// index page
app.get('/', function(req, res) {
  res.render('home');
});

// about page
app.get('/about', function(req, res) {
  res.render('pages/about');
});


// Logging out
app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/');
})

app.listen(process.env.PORT || 8080, function(){
  console.log("Server running on port 8080" );
});