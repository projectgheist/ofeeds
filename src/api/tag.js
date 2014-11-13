var ex = require('express'),
    rs = require('rsvp'),
    db = require('../storage'),
    ut = require('../utils'),
	cf = require('../../config');
    
var app = module.exports = ex();

// To mark a post as read,starred,...
app.post('/api/0/tag/edit', function(req, res) {
    // is user logged in?
    if (!req.isAuthenticated()) {
    	return;
	}
    var items = ut.parseItems(req.body.i);
    if (!items) {
        return res.send(400, 'Error=InvalidItem');
	}
    var streams = ut.parseFeeds(req.body.s);
    if (req.body.s && !streams) {
        return res.send(400, 'Error=InvalidStream');
	}
    if (streams && streams.length !== items.length) {
        return res.send(400, 'Error=UnknownCount');
	}
    var at = ut.parseTags(req.body.a, req.user),
		rt = ut.parseTags(req.body.r, req.user);
	
    // TODO: use streams to filter
    db.Post.where('_id').in(items).then(function(posts) {
        return rs.all(posts.map(function(post) {
            return db.editTags(post, addTags, removeTags).then(function() {
				return post.save();
            });
        }));
    }).then(function() {
        res.send('OK');
    }, function(err) {
        res.status(500).send(err);
    });
});

// rename a stream folder
app.post('/api/0/tag/rename', function(req, res) {
    // is user logged in?
    if (!req.isAuthenticated()) {
        return;
	}
    var orig = ut.parseTags(req.body.s, req.user),
		dest = ut.parseTags(req.body.dest, req.user);
    if (!orig || !dest) {
        return res.send(400, 'Error=InvalidStream');
	}
    // TODO: if dest is another existing tag, the tags need to be merged
    db.Tag.update(orig[0], dest[0]).then(function() {
        res.send('OK');
    }, function(err) {
        res.status(500).send(err);
    });
});

// mark all posts in a stream as read
app.post('/api/0/tag/mark-all-as-read', function(req, res) {
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
    
    rs.all([tag, posts]).then(function(results) {
        var tag = results[0], 
			posts = results[1];
        
        // Add the tag to each of them
        return rs.all(posts.map(function(post) {
            post.tags.addToSet(tag);
            return post.save();
        }));
    }).then(function() {
        res.send('OK');
    }, function(err) {
        res.status(500).send(err);
    });
});