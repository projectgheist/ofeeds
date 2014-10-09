/** Module dependencies
 */
var config = require('../config');

/** Custom description
 */
module.exports = function(app, passport) {
	/** home route */
	app.get("/", function(req, res) {
		res.render('dashboard', { 
			'config': config.site
		});
	});
};