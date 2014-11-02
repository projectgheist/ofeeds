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
       // Find or create feed for this URL in the database
		return db.Feed.find({ $or: [{title: {$regex: new RegExp('.*'+url+'.*','i')}}, {feedURL: {$regex: url}}] }).limit(6).then(function(results) {
			if (results.length > 0) {
				return results;
			} else if (ut.isUrl(url)) {
				return db.findOrCreate(db.Feed, {feedURL: encodeURIComponent(url)}).then(cr.FetchFeed).then(function(f) { 
					// return feed in array form
					return [f]; 
				});
			} else {
				return false;
			}
		});
	},
	refresh: function(ctx, url) {
        // Find feed for this URL in the database
        return db.Feed.findOne({feedURL: url}).then(cr.FetchFeed);
	},
    subscribe: function(ctx, url) {
        // Find or create feed for this URL in the database
        var feed = db.findOrCreate(db.Feed, {feedURL: encodeURIComponent(url)}),
		// Find or create a tag to add this feed to the users reading-list
			tag = db.findOrCreate(db.Tag, ut.parseTags('user/-/state/reading-list', ctx.user)[0]);
		// wait for all results to return before continuing
        return rs.all([feed,tag]).then(function(results) {
			// local ref to feed
            var f = results[0];
            // if this feed doesn't have any subscribers, fetch the feed
            if (f.numSubscribers === 0) {
				return cr.FetchFeed(f).then(function(n) { 
					return [n,results[1]]; 
				}, function(err) {
					return [];
				});
            }
			return results;
        }).then(function(results) {
			if (results.length <= 0) {
				return {};
			}
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
			// update db and return feed
			return f.save();
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
			return db.Feed.find({tags:results}).sort({'title':1});
		}).then(function(feeds) {
			var s = feeds.map(function(f) {
				var categories = f.tagsForUser(req.user).map(function(tag) {
					return {
						id: 	tag.stringID,
						label: 	tag.name
					};
				});
				return {
					favicon:		f.favicon,
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
	// creat or find URL in db
    actions.search(req, req.query.q).then(function(feeds) {
		if (feeds) {
			var vs = [];
			for (var i in feeds) {
				var d = feeds[i].description;
				vs.push({
					type:'feed',
					value:feeds[i].feedURL,
					title:feeds[i].title,
					description:(d ? (d.length < 32 ? d : (d.substring(0, 28) + ' ...')) : '')
					});
			};
			res.json(vs);
		} else {
			res.status(500).send('Feed not found!');
		}
    });
});

// fetch a feed
app.get('/api/0/subscription/refresh', function(req, res) {
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
	.refresh(req, req.query.q)
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
