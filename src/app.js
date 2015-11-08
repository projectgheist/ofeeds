/** Module dependencies
 */
var ex = require('express'),
	cf = require('../config'),
	ap = ex();

/** Load configurations
 */
ap.set('views', cf.Dir() + 'views');
ap.set('view engine', 'jade');
ap.use(ex.static(cf.Dir() + 'public'));

/** turn off console.log
 */
if (false) {
	console.log = function() {};
}

/** GET / POST Pages
 */
ap.listen(cf.Port(), cf.IpAddr(), function(){});

/** Export reference
 */
module.exports = ap;