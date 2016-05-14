/** Includes
 */
var mg = require('mongoose');
var sh = require('shortid');
var ut = require('../utils');

var Tag = mg.Schema({
	user: ut.ref('User'),
	type: String, // state or label
	name: String, // encoded unique url or ...
	shortid: { type: String, default: sh.generate }
});

module.exports = mg.model('Tag', Tag);
