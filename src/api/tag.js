var ex = require('express'),
    rs = require('rsvp'),
    db = require('../storage'),
    ut = require('../utils'),
	cf = require('../../config');
    
var app = module.exports = ex();

app.get('/api/0/tag/list', function(req, res) {
    // is user logged in?
	if (!ut.checkAuth(req, res)) {
        return;
	}
	// find tags for user
    db.Tag
	.find({user: req.user})
	.then(function(tags) {
        var ret = [];
        tags.forEach(function(tag) {
            if (!(tag.type == 'state' && tag.name == 'reading-list')) {
                ret.push({
                    id: tag.stringID,
                    sortid: tag.sortID
                });
            }
        });    
        ut.respond(res, {tags: ret});
    }, function(err) {
        res.send(500, 'Error=Unknown');
    });
});

app.post('/api/0/tag/edit', function(req, res) {
    // is user logged in?
	if (!ut.checkAuth(req, res)) {
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
        res.send(500, 'Error=Unknown');
    });
});

app.post('/api/0/tag/rename-tag', function(req, res) {
    // is user logged in?
	if (!ut.checkAuth(req, res)) {
        return;
	}
        
    var source = ut.parseTags(req.body.s, req.user);
    var dest = ut.parseTags(req.body.dest, req.user);
    
    if (!source || !dest)
        return res.send(400, 'Error=InvalidStream');
        
    // TODO: if dest is another existing tag, the tags need to be merged
    db.Tag.update(source[0], dest[0]).then(function() {
        res.send('OK');
    }, function(err) {
        return res.send(500, 'Error=Unknown');
    });
});

app.post('/api/0/tag/disable-tag', function(req, res) {
    if (!ut.checkAuth(req, res, true))
        return;
        
    var tag = ut.parseTags(req.body.s, req.user);
    if (!tag)
        return res.send(400, 'Error=InvalidStream');
        
    db.Tag.findOneAndRemove(tag[0]).then(function(tag) {            
        if (tag) {
            // remove references to this tag from subscriptions and posts
            return rs.all([
                db.Feed.update({}, { $pull: { tags: tag }}),
                db.Post.update({}, { $pull: { tags: tag }})
            ]);
        }
    }).then(function() {
        res.send('OK');
    }, function(err) {
        res.send(500, 'Error=Unknown');
    });
});

app.post('/api/0/tag/mark-all-as-read', function(req, res) {
    if (!ut.checkAuth(req, res, true))
        return;
        
    var streams = ut.parseStreams(req.body.s, req.user);
    if (!streams)
        return res.send(400, 'Error=InvalidStream');
    
    // Check if the timestamp parameter is set.
    // If so, add to postsForStreams options.
    var options = {};
    if (req.body.ts)
        options.maxTime = req.body.ts;
        
    // Find or create the read state tag
    var tag = ut.parseTags('user/-/state/read', req.user)[0];
    tag = db.findOrCreate(db.Tag, tag);

    // Get all of the posts in the stream
    // Google Reader appears to only accept a single stream
    var posts = db.postsForStreams(streams, options);
    
    rs.all([tag, posts]).then(function(results) {
        var tag = results[0], posts = results[1];
        
        // Add the tag to each of them
        return rs.all(posts.map(function(post) {
            post.tags.addToSet(tag);
            return post.save();
        }));
    }).then(function() {
        res.send('OK');
    }, function(err) {
        res.send(500, 'Error=Unknown');
    });
});