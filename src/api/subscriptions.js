var ex = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	mm = require('moment'),
	ut = require('../utils');

var app = module.exports = ex();

// @todo: functions need to be merged
var actions = {
	search: function(ctx, url) {
		var u = encodeURIComponent(url);
        // Find or create feed for this URL in the database
		return db.Feed.find({ $or: [{title: {$regex: u}}, {feedURL: {$regex: u}}] }).limit(6).then(function(rslt0) {
			if (rslt0.length > 0) {
				return rslt0;
			} else if (ut.isUrl(url)) {
				return db.findOrCreate(db.Feed, {feedURL: u}).then(cr.FetchFeed).then(function(f) { 
					// update db
					f.save();
					// return feed in array form
					return [f]; 
				});
			} else {
				return false;
			}
		});
	},
    subscribe: function(ctx, url) {
        // Find or create feed for this URL in the database
        var feed = db.findOrCreate(db.Feed, {feedURL: encodeURIComponent(url)});
		// Find or create a tag to add this feed to the users reading-list
		var tag = db.findOrCreate(db.Tag, ut.parseTags('user/-/state/reading-list', ctx.user)[0]);
		// wait for all results to return before continuing
        return rs.all([feed,tag]).then(function(results) {
			// local ref to feed
            var f = results[0];
            // if this feed doesn't have any subscribers, fetch the feed
            if (f.numSubscribers === 0) {
				return cr.FetchFeed(f).then(function(n) { 
					return [n,results[1]]; 
				});
            }
			return results;
        }).then(function(results) {
 			// local ref to feed and tag variable
            var f = results[0],
				t = results[1];
			// Subscribe to the feed if the tag was not found
            if (!~f.tags.indexOf(t.id)) {
				// add tag to feed's tag list
				f.tags.addToSet(t);
				// increment subscriber count
                f.numSubscribers++; 
            }
			// update db
			f.save();
			// return feed
			return f;
		});
    }
};

// lists all of the feeds a user is subscribed to
app.get('/api/0/subscription/list', function(req, res) {
    /** Check auth
	 */
	if (!req.isAuthenticated()) {
		res.status(500).send('User feed not defined!');
	} else {
		// get tag for getting all feeds the user is subscribed to
		var r = ut.parseTags('user/-/state/reading-list', req.user)[0];
		return db.Tag.findOne(r).then(function(results) {
			// no feeds returned
			if (!results) {
				return [];
			}
			return db.Feed.find({tags:results});
		}).then(function(feeds) {
			var s = feeds.map(function(f) {
				var categories = f.tagsForUser(req.user).map(function(tag) {
					return {
						id: tag.stringID,
						label: tag.name
					};
				});
				return {
					id: 			encodeURIComponent(['feed/',f.feedURL].join('')),
					title: 			f.titleForUser(req.user),
					unreadcount: 	0, // TODO
					shortid: 		f.shortID,
					categories: 	categories
				};
			});
			return res.json(s);
		}, function(err) {
			res.status(500).send(err);
		});
	}
});

// search for feeds and preview them before adding them to their account
app.get('/api/0/subscription/search', function(req, res) {
	var u = decodeURIComponent(req.query.q);
	// creat or find URL in db
    actions.search(req, req.query.q).then(function(feeds) {
		if (feeds) {
			var vs = [];
			for (var i in feeds) {
				vs.push({type:'feed',value:feeds[i].feedURL,title:feeds[i].title});
			};
			res.json(vs);
		} else {
			res.status(500).send('Feed not found!');
		}
    });
});

app.post('/api/0/subscription/quickadd', function(req, res) {
    /** Check auth
	 */
	if (!req.isAuthenticated()) {
        return;
	}
	var u = decodeURIComponent(req.query.q);
	// Check if URL
    if (!ut.isUrl(u)) {
        return res.json({
            query: u,
            numResults: 0
        });
    }
	// creat or find URL in db
    actions
	.subscribe(req, req.query.q)
	.then(function(feed) {
        res.json({
            query: u,
            numResults: 1,
            streamId: 'feed/' + u
        });
    }, function(err) {
        res.status(500).send(err);
    });
});
