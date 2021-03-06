/** Includes
 */
var mg = require('mongoose');

var User = mg.Schema({
	openID: { type: String, required: true, unique: true },
	provider: String, // eg. google, facebook, ...
	email: String,
	name: String,
	lastLogin: { type: Date, default: Date.now },
	signupTime: { type: Date, default: Date.now }
});

module.exports = mg.model('User', User);
