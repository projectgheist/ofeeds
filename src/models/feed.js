/** Includes
 */
var mg = require('mongoose'),
	ut = require('../utils'),
	sh = require('shortid');

// A Feed containing posts, shared across all users
var Feed = mg.Schema({
    // feed metadata
	favicon: String,
    title: String,
    description: String,
    author: String,
    language: String,
    copyright: String,
    categories: [String],
    feedURL: { type: String, index: { unique: true }},
    siteURL: String,
    posts: [ut.ref('Post')],
    
    // tags and titles for individual users
    // a user is considered subscribed to a feed if there is a 
    // user/-/state/reading-list tag on the feed for that user
    tags: [ut.ref('Tag')],
    numSubscribers: { type: Number, default: 0 },
    userTitles: { type: {}, default: {} },
	shortID: { type: String, default: sh.generate },
    
    // fetcher metadata
    successfulCrawlTime: Date,
    failedCrawlTime: Date,
    lastFailureWasParseFailure: { type: Boolean, default: false },
    lastModified: { type: Date, default: Date.now },
    creationTime: { type: Date, default: Date.now },
});

Feed.virtual('stringID').get(function() {
    return 'feed/' + this.feedURL;
});

// Gets the tags for a user, assuming they have already been populated
Feed.methods.tagsForUser = function(user) {
    return this.tags.filter(function(tag) {
        return (tag.user === user.id) && (tag.type === 'label');
    });
};

Feed.methods.titleForUser = function(user) {
    return this.userTitles[user.id] || this.title || '(title unknown)';
};

Feed.methods.setTitleForUser = function(title, user) {
    this.userTitles[user.id] = title;
    this.markModified('userTitles');
    return this;
};

Feed.pre('remove', function(callback) {
    mg.model('Post').where('_id').in(this.posts).remove(callback);
});

module.exports = mg.model('Feed', Feed);