/** Includes
 */
var mg = require('mongoose'),
	ut = require('../utils'),
	sh = require('shortid');

var Tag = mg.Schema({
    user: ut.ref('User'),
    type: String, // state or label
    name: String, // encoded url or ...
    shortID: { type: String, default: sh.generate() }
});

Tag.virtual('stringID').get(function() {
    return 'user/' + (this.user._id || this.user) + '/' + this.type + '/' + this.name;
});

module.exports = mg.model('Tag', Tag);