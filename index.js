/** Module dependencies
 */
var ap = require('./src/app');
var cf = require('./config');

/** turn off console.log
 */
if (false) {
	console.log = function () {};
}

/** GET / POST Pages
 */
ap.listen(cf.Port(), cf.IpAddr(), function () {});

/** startup/connect to database
 */
require('./src/storage');

/** GET / POST Pages
 */
require('./src/strategies/google');
require('./src/routes');

/** Include routes
 */
require('./src/api/subscriptions');
require('./src/api/posts');
require('./src/api/streams');
require('./src/api/tags');
require('./src/api/opml');
// app.use(require('./src/api/pref'));
