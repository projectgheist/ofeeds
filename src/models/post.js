/** Includes
 */
var mg = require('mongoose');
var sh = require('shortid');
var ut = require('../utils');

// A Post in a Feed, shared across all users
// User specific tags stored here to avoid having separate post records for each user
var Post = mg.Schema({
	// reference to the feed this post belongs to
	feed: ut.ref('Feed'),
	// unique short id
	shortid: { type: String, default: sh.generate },
	// post title
	title: String,
	// post html markup
	body: String,
	// the first paragraph of the article
	summary: String,
	// object that contains URLs to images in the post
	images: mg.Schema.Types.Mixed,
	// array of found video URLs
	videos: [String],
	// URL to original post location
	url: { type: String, required: true, sparse: true },
	// timestamp of post publish date
	published: Date,
	// timestamp of post update date
	updated: Date,
	// author/writer of the post
	author: String,
	// url link to comments page
	commentsURL: String,
	categories: [String],
	// array of tags that are attached to this post
	tags: { type: [ut.ref('Tag')], default: [] }
});

/** Export
 */
module.exports = mg.model('Post', Post);
