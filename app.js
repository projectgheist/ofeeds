/** Module dependencies
 */
var express = require('express'),
	cf = require('./config'),
	db = require('./src/storage'),
	app = express();

/** Load configurations
 */
app.set('port', cf.Port());
app.set('ipaddr', cf.IpAddr());
app.set('views', cf.Dir() + 'views');
app.set('view engine', 'jade');
app.use(express.static(cf.Dir() + 'public'));

/** GET / POST Pages
 */
app.listen(app.get('port'), app.get('ipaddr'), function(){
	console.log('%s: Node server started on %s:%d ...', Date(Date.now()), app.get('ipaddr'), app.get('port'));
});

/** startup database
 */
db.connect(cf.db);

/** GET / POST Pages
 */
require('./src/routes')(app); 

/** Include routes
 */
app.use(require('./src/api/subscriptions'));
app.use(require('./src/api/streams'));

/*
app.use(require('./src/api/user'));
app.use(require('./src/api/tag'));
app.use(require('./src/api/preference'));
*/