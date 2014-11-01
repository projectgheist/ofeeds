/** Includes
 */
var mg = require('mongoose'),
	sh = require('shortid'),
    ut = require('../utils');

// A Post in a Feed, shared across all users
// User specific tags stored here to avoid having separate post records for each user
var Post = mg.Schema({
	shortID: {type: String, unique: true, default: sh.generate},
    feed: ut.ref('Feed'),
    guid: String,							// unique post identifier for this feed
    title: String, 							// post title
    body: String,							// post html markup
    summary: String,
    images: mg.Schema.Types.Mixed,
	videos: [String],						// array of found video URLs
	url: String,							// URL to original post location
    published: Date,						// post html markup
    updated: Date,
    author: String,							// author/writer of the post
    commentsURL: String,
    categories: [String],
	tags: [ut.ref('Tag')]
});

Post.virtual('longID').get(function() {
    return 'tag:reader/item/' + this.id;
});

module.exports = mg.model('Post', Post);