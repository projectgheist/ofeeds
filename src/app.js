/** Module dependencies
 */
var ex = require('express');
var cf = require('../config');
var ap = ex();

/** Load configurations
 */
ap.set('views', cf.Dir() + 'views');
ap.set('view engine', 'jade');
ap.set('view cache', true);
ap.use(ex.static(cf.Dir() + 'public'));

/** Export reference
 */
module.exports = ap;
