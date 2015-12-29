/** Module dependencies
 */
var cf = require('../config');
var ap = require('./app');

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuth (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
}

/** home route */
ap.get('/', function (req, res) {
	if (req.isAuthenticated()) {
		res.redirect('/subscription/user/reading-list');
	} else {
		res.render('pages/landing', {
			'config': cf.site
		});
	}
});

/** login route */
ap.get('/login', function (req, res) {
	res.redirect('/');
});

/** logout route */
ap.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

/** manage route */
ap.get('/manage', function (req, res) {
	res.render('pages/landing', {
		'config': cf.site,
		'user': req.user
	});
});

/** single feed route */
ap.get('/feed/*', function (req, res) {
	res.render('pages/landing', {
		'config': cf.site,
		'user': req.user
	});
});

/** single post route */
ap.get('/post/*', function (req, res) {
	res.render('pages/landing', {
		'config': cf.site,
		'user': req.user
	});
});

/** templates route */
ap.get('/views/*', function (req, res) {
	if (Object.keys(req.params).length && req.params[0].length) {
		res.render(req.params[0], {
			'config': cf.site,
			'user': req.user
		});
	} else {
		res.render('elements/unknown', {});
	}
});
