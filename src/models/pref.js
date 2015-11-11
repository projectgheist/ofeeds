/** Includes
 */
var mg = require('mongoose');
var ut = require('../utils');

var Preference = mg.Schema({
	user: ut.ref('User'),
	stream: String,
	key: String,
	value: String
});

module.exports = mg.model('Pref', Preference);
