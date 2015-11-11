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

/** Export reference
 */
module.exports = ap;
