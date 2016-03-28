var rs = require('rsvp');
var db = require('../storage');
var ut = require('../utils');
var ap = require('../app');

// To mark a post as read,starred,...
ap.post('/api/0/tags/edit', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	} else if (ut.isEmpty(req.body)) {
		return res.status(400).end();
	} else {
		var arg = req.body;
		if (!arg['i']) {
			return res.status(400).end(); // Invalid item
		}
		var at = ut.parseTags(arg['a'] || 0, req.user); // tags to add to the item
		var rt = ut.parseTags(arg['r'] || 0, req.user); // tags to remove from the item
		if (!at && !rt) {
			return res.status(400).end(); // Invalid tags
		}
		// TODO: use streams to filter
		db.Post
			.where('shortid').in([arg['i']])
			.then(function (posts) {
				return rs.all(posts.map(function (post) {
					return db.editTags(post, at, rt)
						.then(function (data) {
							return data.save();
						});
				}));
			})
			.then(function (data) {
				res.status(200).end();
			});
	}
});

// rename a stream folder
ap.post('/api/0/tags/rename', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	} else if (ut.isEmpty(req.body)) {
		return res.status(400).end();
	} else {
		var orig = ut.parseTags(req.body.s, req.user);
		var dest = ut.parseTags(req.body.dest, req.user);
		if (!orig || !dest) {
			return res.status(400).end();
		}
		// @todo: if dest is another existing tag, the tags need to be merged
		db.Tag
			.update(orig[0], dest[0])
			.then(function () {
				res.status(200).end();
			}, function (ignore) {
				res.status(500).end();
			});
	}
});

// mark all posts in a stream as read
ap.post('/api/0/tag/mark-all-as-read', function (req, res) {
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	} else if (ut.isEmpty(req.body)) {
		return res.status(400).end();
	} else {
		var streams = ut.parseStreams(req.body.s, req.user);
		if (!streams) {
			return res.status(400).end();
		}

		// Declare options
		var options = {};

		// Check if the timestamp parameter is set.
		if (req.body.ts) {
			options.maxTime = req.body.ts;
		}

		// Find or create the read state tag query
		var tag = db.getTags(ut.parseTags('user/-/state/read', req.user));

		// Get all of the posts in the stream
		// Google Reader appears to only accept a single stream
		var posts = db.getPosts(streams, options);

		rs.all([tag, posts.query])
			.then(function (results) {
				// local reference
				var tags = results[0];
				// Add the tag to each of them
				return rs.all(results[1].map(function (post) {
					post.tags.addToSet(tags);
					return post.save();
				}));
			})
			.then(function () {
				res.status(200).end();
			}, function (ignore) {
				res.status(500).end();
			});
	}
});
