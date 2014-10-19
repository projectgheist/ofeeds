var mg = require('mongoose'),
    ut = require('../utils');
    
var User = mg.Schema({
	openID: { type: String, required: true, index: { unique: true } },
	provider: String, // eg. google, facebook, ...
	email: String,
	name: String,
    lastLogin: { type: Date, default: Date.now },
	signupTime: { type: Date, default: Date.now }
});

// A getter that returns a promise for all of the feeds a user is subscribed to
User.virtual('feeds').get(function() {
	// variables to feed and tag mongoose models
    var f = mg.model('Feed'),
        t = mg.model('Tag');
	// get tag for getting all feeds the user is subscribed to
    var r = utils.parseTags('user/-/state/reading-list', this)[0];
    return t.findOne(r).then(function(results) {
		// no feeds returned
        if (!results) {
			return [];
		}
        return f.find({ tags: results }).populate('tags');
    });
});

module.exports = mg.model('User', User);