/** Module dependencies
 */
var ap = require('./src/app');

/** startup/connect to database
 */
require('./src/storage');

/** GET / POST Pages
 */
require('./src/auth'); 
require('./src/routes'); 

/** Include routes
 */
ap.use(require('./src/api/subscriptions'));
ap.use(require('./src/api/posts'));
ap.use(require('./src/api/streams'));
ap.use(require('./src/api/tag'));
/*
app.use(require('./src/api/preference'));
*/