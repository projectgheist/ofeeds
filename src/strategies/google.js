/** Module dependencies
 */
var pp = require('../auth');
var cf = require('../../config');
var db = require('../storage');
var ap = require('../app');

var Strategy = require('passport-google-oauth').OAuth2Strategy;

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

pp.use(
	'google',
	new Strategy({
		clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
		clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
		callbackURL: cf.Url() + '/auth/google/callback'
	},
	function (token, tokenSecret, profile, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {
			return db
				.findOrCreate(db.User, {openID: profile.id})
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

