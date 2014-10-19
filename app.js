/** Module dependencies
 */
var ex = require('express'),
	ss = require('express-session'),
	cf = require('./config'),
	pp = require('passport'),
	ap = ex();

/** Load configurations
 */
ap.set('views', cf.Dir() + 'views');
ap.set('view engine', 'jade');
ap.use(ss({secret: 'ofeeds_secret_key'}));
ap.use(pp.initialize());
ap.use(pp.session());
ap.use(ex.static(cf.Dir() + 'public'));

/** turn off console.log
 */
if (false) {
	console.log = function() {};
}

/** GET / POST Pages
 */
ap.listen(cf.Port(), cf.IpAddr(), function(){
	console.log('%s: Node server started on %s:%d ...', Date(Date.now()), cf.IpAddr(), cf.Port());
});

/** startup/connect to database
 */
require('./src/storage').setup()

/** GET / POST Pages
 */
ap.use(require('./src/auth')); 
ap.use(require('./src/routes')); 

/** Include routes
 */
ap.use(require('./src/api/subscriptions'));
ap.use(require('./src/api/streams'));

/*
app.use(require('./src/api/tag'));
app.use(require('./src/api/preference'));
*/