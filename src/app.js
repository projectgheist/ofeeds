/** Module dependencies
 */
var ex = require('express');
var cf = require('../config');
var ss = require('express-session');
var bp = require('body-parser');
var ap = ex();

/** Load configurations
 */
ap.set('views', cf.Dir() + 'views');
ap.set('view engine', 'jade');
ap.use(ss({
	secret: 'ofeeds_secret_key',
	resave: false,
	saveUninitialized: false
}));
ap.use(ex.static(cf.Dir() + 'public'));
ap.use(bp.urlencoded({
	extended: false
}));

/** Export reference
 */
module.exports = ap;
