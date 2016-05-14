var rs = require('rsvp');
var db = require('../storage');
var ut = require('../utils');
var ap = require('../app');

// Get a new tag, used to create folders
ap.get('/api/0/tags', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	} else if (ut.isEmpty(req.query) || !req.query['s'] || !req.query.s.length) {
		return res.status(400).end();
	} else {
		db
			.findOrCreate(db.Tag, {
				user: req.user,
				name: req.query.s,
				type: (req.query.t || 'label')
			})
			.then(function (data) {
				res.status(200).end();
			});
	}
});

// To mark a post as read, starred,...
ap.post('/api/0/tags/edit', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	} else if (ut.isEmpty(req.body) || !req.body['i']) {
		return res.status(400).end();
	} else {
		var arg = req.body;
		// tags to add to the item
		var at = ut.parseTags(arg['a'] || 0, req.user);
		// tags to remove from the item
		var rt = ut.parseTags(arg['r'] || 0, req.user);
		// check for validity
		if (!at.length && !rt.length) {
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
		// find names
		var tags = ut.parseTags([req.body.s, req.body.dest], req.user);
		// early out?
		if (!tags.length || tags.length < 2) {
			return res.status(400).send('Invalid tag names!');
		}
		// original tag name
		var orig = tags[0];
		// new tag name
		var dest = tags[1];
		// @todo: if dest is another existing tag, the tags need to be merged
		db
			.renameTag(orig, dest)
			.then(function () {
				res.status(200).end();
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
		var streams = ut.createArray(req.body.s);
		if (!streams.length) {
			return res.status(400).end();
		}

		// Declare options
		var options = {};

		// Check if the timestamp parameter is set.
		if (req.body.ts) {
			options.maxTime = parseFloat(req.body.ts);
		}

		// Declare read-tag
		var readTag;

		// Get all of the posts in the stream
		// Google Reader appears to only accept a single stream
		return 	db
			.getTags(ut.parseTags(['user/-/state/reading-list', 'user/-/state/read'], req.user))
			.then(function (tagArray) {
				options.includeTags = ut.createArray(tagArray[0]);
				readTag = tagArray[1];
				return db.getPosts(streams, options);
			})
			.then(function (posts) {
				return posts.query
					.then(function (results) {
						if (results.length) {
							// Add the tag to each of them
							return rs.all(results.map(function (post) {
								post.tags.addToSet(readTag);
								return post.save();
							}));
						}
					})
					.then(function () {
						res.status(200).end();
					});
			});
	}
});
