var ex = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cf = require('../../config'),
	ut = require('../utils');
	
var app = module.exports = ex();

/**
 */
app.get('/api/0/posts', function(req, res) {
	// make options variable
	var opts = {
		sort: { published:(!req.query.r || req.query.r !== 'o') ? -1 : 1 }, // newest first
		limit: req.query.n || 5 // limit the amount of output feeds
	};
	
	db
		.all(db.Post, opts) // retrieve all feeds
		.populate('feed') // replacing the specified paths in the document with document(s) from other collection(s)
		.then(function(posts) {
			var fp = db.formatPosts({}, posts); // formatted posts
			return res.json(fp);
		});
});

/**
 */
app.get('/api/0/post/*', function(req, res) {
	// has parameters?
	var q = req.params.length ? req.params : req.query;
	if (q) {
		console.log(q);
		// create query
        db.Post
		.find({
			//guid: 
        })
		.then(function(post) {
			return res.json(post);
        });
	} else {
        return res.status(400).send('InvalidParams');
	}
});