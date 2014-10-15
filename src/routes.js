/** Module dependencies
 */
var ex = require('express'),
	cf = require('../config');
	
var ap = ex();

/** home route */
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

/** home route */
ap.param('uid', /^[0-9]+$/);
ap.param('name', /^.*$/);

/** Custom description
 */
module.exports = function(app, passport) {

	/** home route */
	app.get("/", function(req, res) {
		res.render('dashboard', { 
			'config': cf.site
		});
	});
	/** home route */
	app.get("/templates/:name", function(req, res) {
		res.render('templates/' + req.params.name);
	});
};