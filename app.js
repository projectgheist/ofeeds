/** Module dependencies
 */
var express = require('express'),
	config = require('./config'),
	db = require('./src/storage'),
	app = express();

/** Load configurations
 */
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
//app.use(express.session({ secret: 'open_feeds_secret' }));
//app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

/** GET / POST Pages
 */
app.listen(app.get('port'));

/** startup database
 */
db.connect(config.db);

/** Cron jobs execution
 */
require('./src/cron')();

/** GET / POST Pages
 */
require('./src/routes')(app); 

/** Include routes
 */
/*
app.use(require('./src/api/user'));
app.use(require('./src/api/subscription'));
app.use(require('./src/api/stream'));
app.use(require('./src/api/tag'));
app.use(require('./src/api/preference'));
*/