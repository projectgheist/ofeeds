/** Module dependencies
 */
var cf = require('../config');
var pp = require('passport');
var db = require('./storage');
var ap = require('./app');

var Strategy = require('passport-google-oauth').OAuth2Strategy;

/** Load configurations
 */
ap.use(require('express-session')({
	secret: 'ofeeds_secret_key',
	resave: false,
    saveUninitialized: false
}));

ap.use(pp.initialize());
ap.use(pp.session());

// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the aplication at '/auth/google/callback'
ap.get('/auth/google',
		pp.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/userinfo.email' }));

// Google will redirect the user to this URL after authentication.  Finish
// the process by verifying the assertion.  If valid, the user will be
// logged in.  Otherwise, authentication has failed.
ap.get('/auth/google/callback',
		pp.authenticate('google', { successRedirect: '/subscription/user/reading-list',
									failureRedirect: '/' }));

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
pp.serializeUser(function (user, done) {
	done(null, user);
});

pp.deserializeUser(function (obj, done) {
	done(null, obj);
});

pp.use(new Strategy({
		clientID: cf.Google().ClientID,
		clientSecret: cf.Google().ClientSecret,
		callbackURL: cf.Url() + '/auth/google/callback'
	},
	function (token, tokenSecret, profile, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {
			return db.findOrCreate(db.User, {openID: profile.id})
			.then(function (user) {
				// store retrieved info
				user.provider 	= profile.provider;
				user.email		= profile.emails[0].value;
				user.name		= profile.displayName;
				// store in db
				return user.save();
			})
			.then(function (user) {
				return done(null, user);
			});
		});
	}
));
