/** Module dependencies
 */
var pp = require('passport');
var ap = require('./app');

/** Load configurations
 */

/** Sessions */
ap.use(require('express-session')({
	secret: 'ofeeds_secret_key',
	resave: false,
    saveUninitialized: false
}));

/** Enable body parsing */
var bp = require('body-parser');
ap.use(bp.urlencoded({
	extended: false
}));
ap.use(bp.json());

/** Setup of Passport.js */
ap.use(pp.initialize());
ap.use(pp.session());

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

/** Export as module */
module.exports = pp;
