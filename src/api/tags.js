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
		var p = req.body;
		var items = ut.parseItems(p['i'] || 0);
		if (!items) {
			return res.status(400).end(); // Invalid item
		}
		var at = ut.parseTags(p['a'] || 0, req.user); // tags to add to the item
		var rt = ut.parseTags(p['r'] || 0, req.user); // tags to remove from the item
		// TODO: use streams to filter
		db.Post
			.where('_id').in(items)
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
		return;
	}
	var orig = ut.parseTags(req.body.s, req.user);
	var dest = ut.parseTags(req.body.dest, req.user);
	if (!orig || !dest) {
		return res.send(400, 'Error=InvalidStream');
	}
	// TODO: if dest is another existing tag, the tags need to be merged
	db.Tag.update(orig[0], dest[0]).then(function () {
		res.send('OK');
	}, function (err) {
		res.status(500).send(err);
	});
});

// mark all posts in a stream as read
ap.post('/api/0/tag/mark-all-as-read', function (req, res) {
	if (!req.isAuthenticated()) {
		return;
	}
	var streams = ut.parseStreams(req.body.s, req.user);
	if (!streams) {
		return res.send(400, 'Error=InvalidStream');
	}
	// Check if the timestamp parameter is set.
	// If so, add to postsForStreams options.
	var options = {};
	if (req.body.ts) {
		options.maxTime = req.body.ts;
	}
	// Find or create the read state tag
	var tag = db.findOrCreate(db.Tag, ut.parseTags('user/-/state/read', req.user)[0]);

	// Get all of the posts in the stream
	// Google Reader appears to only accept a single stream
	var posts = db.postsForStreams(streams, options);

	rs.all([tag, posts]).then(function (results) {
		var tag = results[0];
		var posts = results[1];

		// Add the tag to each of them
		return rs.all(posts.map(function (post) {
			post.tags.addToSet(tag);
			return post.save();
		}));
	}).then(function () {
		res.send('OK');
	}, function (err) {
		res.status(500).send(err);
	});
});
