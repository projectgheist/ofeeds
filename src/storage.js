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
	var all = add.concat(remove);
	// returns a promise
	return rs
		.all(all)
		.then(function () {
			return record;
		});
};

/** function getTags
 */
exports.getTags = function (tags) {
	if (tags) {
		if (!Array.isArray(tags)) {
			tags = [tags];
		}
		// make sure it has elements inside the array
		if (tags.length > 0) {
			return exports.Tag.find({ $or: tags });
		}
	}
	return [];
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
	// separate streams by type
	var feeds = [];
	var tags = [];
	// loop all items in stream
	for (var i in streams) {
		if (streams[i].type === 'feed') {
			feeds.push(streams[i].value);
		} else {
			tags.push(streams[i].value);
		}
	}
	// load the tags to include and exclude
	var includeTags, excludeTags;
	//
	return rs
		.all([exports.getTags(tags), exports.getTags(options.excludeTags)])
		.then(function (multipleTags) {
			// store for later use
			includeTags = multipleTags[0];
			excludeTags = multipleTags[1];
			// find feeds given directly and by tag
			return exports.Feed.find({
				$or: [
					{ feedURL: { $in: feeds } },
					{ tags: { $in: includeTags, $nin: excludeTags } }
				]
			});
		})
		.then(function (rfeeds) {
			// find posts by feed and tags, and filter by date
			var query = exports.Post.find({
				$or: [
					{ feed: { $in: rfeeds } },
					{ tags: { $in: includeTags } }
				],
				tags: { $nin: excludeTags },
				updated: {
					$gte: new Date(parseInt(options.minTime, 0)),
					$lt: new Date(parseInt(options.maxTime, Number.MAX_VALUE))
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
				// check if already an array, else make it an array
				if (!Array.isArray(options.populate)) {
					options.populate = [options.populate];
				}
				// loop items to populate in the query
				for (var i in options.populate) {
					query.populate(options.populate[i]);
				}
			}
			return { 'query': query, 'feeds': rfeeds };
		});
};

// formats posts in a format that can be read by the client
exports.formatPosts = function (user, posts) {
	return posts.map(function (post) {
		var isRead = 0;
		var pts = post.tags.map(function (t) {
			var r = t.stringID;
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
