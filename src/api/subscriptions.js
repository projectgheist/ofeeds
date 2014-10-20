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
		console.log("Search action: " + url);
        // Find or create feed for this URL in the database
        var feed = db.findOrCreate(db.Feed, {feedURL: encodeURIComponent(url)});
		// wait for all results to return before continuing
        return rs.all([feed]).then(function(results) {
			// local ref to feed variable
            var f = results[0];
			// has not been successfully fetched OR last successful fetch was longer then 5 minutes ago
            if ((!f.successfulCrawlTime || mm().diff(f.successfulCrawlTime, 'minutes') > 5)) {
				return cr.FetchFeed(f).then(function() {
					console.log("Finish fetch");
					return f;
				});
            }
			return f;
        });
	},
    subscribe: function(ctx, url) {
		console.log("Subscribe action: " + url);
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
				return cr.FetchFeed(f).then(function() {
					console.log("Finish fetch");
					return results;
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
			return f;
		});
    }
};

// lists all of the feeds a user is subscribed to
app.get('/api/0/subscription/list', function(req, res) {
/*
	var c;
	if (req.query.q) {
		var u = decodeURIComponent(req.query.q);
		c = {feedURL: {$in:feeds}};
	} else {
        res.status(500).send('');
	}
	*/
	// Find feeds the user is subscribed to
	console.log(req.user.feeds);
	if (!req.user || !req.user.feeds) {
		res.status(500).send('User feed not defined!');
	} else {
		req.user.feeds.then(function(feeds) {
			var subscriptions = feeds.map(function(feed) {
				var categories = feed.tagsForUser(req.user).map(function(tag) {
					return {
						id: tag.stringID,
						label: tag.name
					};
				});
				return {
					id: 'feed/' + feed.feedURL,
					title: feed.titleForUser(req.user),
					firstitemmsec: 0, // TODO
					shortid: feed.shortID,
					categories: categories
				};
			});
			return res.json({subscriptions: subscriptions});
		}, function(err) {
			res.status(500).send(err);
		});
	}
});

app.post('/api/0/subscription/search', function(req, res) {
	var u = decodeURIComponent(req.query.q);
	// Check if URL
    if (!ut.isUrl(u)) {
        return res.json({
            query: u,
            numResults: 0
        });
    }
	// creat or find URL in db
    actions.search(req, req.query.q).then(function(feed) {
		console.log(feed);
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
    /*
	 * Check auth
	 */
	 /*
	if (!ut.checkAuth(req, res, true)) {
        return;
	}
	*/
		
	var u = decodeURIComponent(req.query.quickadd);
	// Check if URL
    if (!ut.isUrl(u)) {
        return res.json({
            query: u,
            numResults: 0
        });
    }

	// creat or find URL in db
    actions.subscribe(req, req.query.quickadd).then(function() {
        res.json({
            query: u,
            numResults: 1,
            streamId: 'feed/' + u
        });
    }, function(err) {
        res.status(500).send(err);
    });
});
