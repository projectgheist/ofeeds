/** Module dependencies
 */
var ex = require('express'),
	cf = require('../config')
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

/** Parameter declarations */
ap.param('uid', /^[0-9]+$/);
ap.param('name', /^.*$/);

/** home route */
ap.get("/", function(req, res) {
	res.render('dashboard', { 
		'config': cf.site
	});
});
ap.get("/login", function(req, res) {
	res.render('login', { 
		'config': cf.site
	});
});
ap.get("/subscription/*", function(req, res) {
	res.render('dashboard', { 
		'config': cf.site
	});
});
/** templates route */
ap.get("/templates/:name", function(req, res) {
	res.render('templates/' + req.params.name);
});