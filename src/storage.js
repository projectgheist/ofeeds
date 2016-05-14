/** Includes
 */
var mg = require('mongoose');
var rs = require('rsvp');
var ut = require('./utils');
var cf = require('../config');

/** Needs to be done before promisifyAll
 * export the models
 */
exports.User = require('./models/user');
exports.Feed = require('./models/feed');
exports.Post = require('./models/post');
exports.Tag = require('./models/tag');
exports.Pref = require('./models/pref');

// if database is already connected return
if (!mg.connection || !mg.connection.db) {
	// try to connect to db
	mg.connect(ut.getDBConnectionURL(cf.db()), {});
	// declare connection variable
	var db = mg.connection;
	// Add promise support to Mongoose
	require('mongoomise').promisifyAll(db, rs);
	// error event
	db.on('error', function (ignore) {});
	// connection established event
	db.once('open', function () {
		require('./wait');
	});
}

/** function all
 */
exports.all = function (model, options) {
	// use parameter or create empty object
	options || (options = {});
	var q = model.find(options.query || {});
	if (options.sort) {
		q.sort(options.sort);
	}
	if (options.limit) {
		q.limit(options.limit);
	}
	return q;
};

/** function findOrCreate
 * use an empty callback function as a fourth parameter
 */
exports.findOrCreate = function (model, item, debug) {
	return exports.updateOrCreate(model, item, item, debug);
};

/** function updateOrCreate
 */
exports.updateOrCreate = function (model, item, update, debug) {
	// upsert: bool - creates the object if it doesn't exist. Defaults to false.
	var q = model.findOneAndUpdate(item, update, {upsert: true, 'new': true});
	if (debug) console.log(q);
	return q;
};

/** function editTags
 * Adds and removes tags from a subscription or post
 */
exports.editTags = function (record, addTags, removeTags) {
	// optional parameter declaration
	addTags || (addTags = []);
	removeTags || (removeTags = []);

	var add = addTags.map(function (tag) {
		return exports
			.findOrCreate(exports.Tag, tag)
			.then(function (t) {
				record.tags.addToSet(t);
			});
	});
	var remove = removeTags.map(function (tag) {
		return exports.Tag
			.findOne(tag)
			.then(function (t) {
				record.tags.remove(t);
			});
	});
	// create one array with both the add and remove promises
	var all = add.concat(remove);
	// returns a promise
	return rs
		.all(all)
		.then(function () {
			return record;
		});
};

/** function getTags
 @return Empty array or a promise
 */
exports.getTags = function (tags) {
	var result = [];
	if (Array.isArray(tags)) {
		result = exports.Tag.find({ $or: tags });
	}
	return result;
};

/** function renameTag
 * Used to rename folders
 */
exports.renameTag = function (oldTag, newTag) {
	// find old and new tag names
	return exports.Tag
		.find({ $or: [oldTag, newTag] })
		.then(function (tags) {
			// any tags exist?
			if (tags.length) {
				// old or new tag found?
				if (tags.length === 1) {
					// rename the old tag
					if (tags[0] === oldTag) {
						tags[0].rename(newTag).save();
					}
					// no need to rename tag or we renamed the old tag
					return true;
				}
				// merge old and new tags together, find old tag references, point to new tag and delete old tag
				return exports.Feed
					.update({ tags: tags[0] }, { $addToSet: tags[1] })
					.then(function () {
						return exports.Feed.update({ tags: tags[0] }, { $pullAll: tags[0] });
					})
					.then(function () {
						// otherwise it returns a promise
						return true;
					});
			} else {
				return false;
			}
		});
};

// Returns a list of posts for a list of streams (feeds and tags) as parsed
// by utils.parseStreams.
//
// Options:
//   excludeTags - items containing these tags will be excluded from the results
//   minTime - the date of the oldest item to include
//   maxTime - the date of the newest item to include
//   limit - the maximum number of items to return
//   sort - the field to sort (see mongoose docs)
exports.getPosts = function (streams, options) {
	// use parameter OR create empty object
	options || (options = {});

	// default array creation
	options.includeTags || (options.includeTags = []);
	options.excludeTags || (options.excludeTags = []);

	// returns a promise
	return exports.Feed.find({
		$or: [
			{ feedURL: { $in: streams } },
			{ tags: { $in: options.includeTags, $nin: options.excludeTags } }
		]
	})
	.then(function (rfeeds) {
		var maxTime = parseFloat(options.maxTime);
		// find posts by feed and tags, and filter by date
		var query = exports.Post.find({
			$or: [
				{ feed: { $in: rfeeds } },
				{ tags: { $in: options.includeTags } }
			],
			tags: { $nin: options.excludeTags },
			updated: {
				$gte: new Date(parseFloat(options.minTime) || 0),
				$lt: !maxTime ? Date.now() : new Date(maxTime)
			}
		});

		// limit return query amount
		if (options.limit) {
			query.limit(options.limit);
		}

		// sort return query
		if (options.sort) {
			query.sort(options.sort);
		}

		// populate the referenced model variables of the return model
		if (options.populate) {
			options.populate = ut.createArray(options.populate);
			// loop items to populate in the query
			for (var i in options.populate) {
				query.populate(options.populate[i]);
			}
		}

		return {
			'query': query,
			'feeds': rfeeds
		};
	});
};

// formats posts in a format that can be read on the clientside
exports.formatPosts = function (user, posts) {
	return posts.map(function (post) {
		// Flag to indicate if post has been marked as read
		var isRead = 0;
		var pts = post.tags.map(function (ref) {
			var r = ref.stringID;
			// Not already flagged as read (optimization), do read tag check
			if (!isRead && r && ut.isRead(user, r)) {
				isRead = 1;
			}
			return r;
		});
		return {
			uid: post.shortid.toString(),
			title: post.title,
			read: isRead,
			alternate: {
				href: post.url,
				type: 'text/html'
			},
			content: {
				direction: 'ltr',
				summary: post.summary,
				content: post.body,
				images: post.images,
				videos: post.videos
			},
			author: post.author,
			published: (post.published || 0),
			updated: (post.updated || 0),
			categories: pts.concat(post.categories),
			origin: {
				streamId: post.feed.stringID,
				title: post.feed.title,
				favicon: post.feed.favicon,
				url: post.feed.feedURL
			},
			crawlSuccesful: post.feed.lastFailureWasParseFailure,
			crawlTimeMsec: post.feed.successfulCrawlTime ? post.feed.successfulCrawlTime.getTime() : post.published,
			timestampUsec: post.published ? post.published.getTime() : post.feed.successfulCrawlTime.getTime(),
			likingUsers: [],
			comments: [],
			annotations: []
		};
	});
};
