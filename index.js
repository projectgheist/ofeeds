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
require('./src/api/subscriptions');
require('./src/api/posts');
require('./src/api/streams');
require('./src/api/tag');
/*
app.use(require('./src/api/preference'));
*/