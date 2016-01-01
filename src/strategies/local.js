/** Module dependencies
 */
var pp = require('../auth');
var ut = require('../utils');
var db = require('../storage');
var ap = require('../app');

/** Create mock passportjs strategy
 */
var Strategy = require('passport-local').Strategy;
pp.use(
	'local',
	new Strategy(
		function (username, password, done) {
			return db
				.findOrCreate(db.User, { openID: 1, provider: 'local', name: username })
				.then(function (user) {
					return done(null, user);
				});
		}
	)
);

ap.post('/login', function (req, res, next) {
	// make sure that it has params
	if (!ut.isEmpty(req.body)) {
		pp.authenticate('local', function (err, user, info) {
			if (err || !user) {
				res.status(400).end();
			} else {
				req.login(user, function (ignore) {
					if (err) {
						res.status(400).end();
					} else {
						res.status(200).end();
					}
				});
			}
		})(req, res); // !Required
	} else {
		res.status(400).end();
	}
});

