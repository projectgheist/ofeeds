/** Module dependencies
 */
var ex = require('express'),
	cf = require('../config'),
	ut = require('./utils'),
	ap = module.exports = ex();

/** Parameter function */
function param(fn, req, next, id) {
	if (fn instanceof RegExp) { // make sure it is a regular expression
		var captures;
		if (captures = fn.exec(String(req.originalUrl))) {
			req.params[id] = captures;
			next();
		} else {
			next('route');
		}
	}
};

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuth(req, res, next) {
	if (req.isAuthenticated()) { 
		return next(); 
	}
	res.redirect('/login')
}

/** Parameter declarations */
ap.param('uid', function(req, res, next, id) {
	param(/^[0-9]+$/, req, next, id);
});

ap.param('name', function(req, res, next, id) {
	param(/^.*$/, req, next, id);
});

/** home route */
ap.get("/", function(req, res) {
	if (req.isAuthenticated()) {
		res.redirect('/subscription/user/reading-list');
	} else {
		res.render('landing', { 
			'config': cf.site
		});
	}
});

/** login route */
ap.get("/login", function(req, res) {
	res.redirect('/');
});

/** logout route */
ap.get("/logout", ensureAuth, function(req, res) {
	req.logout(); 
	res.redirect('/'); 
});

/** dashboard route */
ap.get("/dashboard", ensureAuth, function(req, res) {
	res.redirect('/subscription/user/reading-list');
});

/** manage route */
ap.get("/manage", function(req, res) {
	res.render('manage', { 
		'config': cf.site,
		'user': req.user
	});
});

/** subscription route */
ap.get("/subscription/*", function(req, res) {
	res.render(req.isAuthenticated() ? 'dashboard' : 'landing', { 
		'config': cf.site,
		'user': req.user
	});
});

/** templates route */
ap.get("/templates/:name", function(req, res) {
	res.render('templates/' + req.params.name, {
		'config': cf.site,
		'user': req.user
	});
});