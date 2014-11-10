/** Module dependencies
 */
var ex = require('express'),
	cf = require('../config'),
	ut = require('./utils'),
	ap = module.exports = ex();

/** Parameter function */
ap.param(function(name, fn) {
	if (fn instanceof RegExp) {
		return function(req, res, next, val){
			var captures;
			if (captures = fn.exec(String(val))) {
				req.params[name] = captures;
				next();
			} else {
				next('route');
			}
		}
	}
});

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
ap.param('uid', /^[0-9]+$/);
ap.param('name', /^.*$/);

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
ap.get("/login", function(req, res) {
	res.redirect('/');
});
/** logout route */
ap.get("/logout", ensureAuth, function(req, res) {
	req.logout(); 
	res.redirect('/'); 
});
ap.get("/dashboard", ensureAuth, function(req, res) {
	res.redirect('/subscription/user/reading-list');
});
ap.get("/subscription/*", ensureAuth, function(req, res) {
	res.render('dashboard', { 
		'config': cf.site,
		'user': req.user
	});
});
/** templates route */
ap.get("/templates/:name", function(req, res) {
	res.render('templates/' + req.params.name, {
		'user': req.user
	});
});