/** Includes
 */
var mg = require('mongoose');
var ut = require('../utils');
var sh = require('shortid');

var Tag = mg.Schema({
	user: ut.ref('User'),
	type: String, // state or label
	name: String, // encoded url or ...
	shortID: { type: String, default: sh.generate }
});

module.exports = mg.model('Tag', Tag);
