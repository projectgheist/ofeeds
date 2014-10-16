 var express = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	ut = require('../utils');

var app = module.exports = express();

var actions = {
	search: function(ctx, url) {
		console.log("Search action: " + url);
        // Find or create feed for this URL in the database
        var feed = db.findOrCreate(db.Feed, {feedURL: encodeURIComponent(url)});
		// wait for all results to return before continuing
        return rs.all([feed]).then(function(results) {
			// local ref to feed variable
            var feed = results[0];
            // If this feed was just added, start a high priority job to fetch it
            if (feed.numSubscribers === 0) {
				return cr.FetchFeed(feed).then(function() {
					console.log("Finish fetch");
					return feed;
				});
            }
			return feed;
        });
	},
    subscribe: function(ctx, url) {
		console.log("Subscribe action: " + url);
    }
};

app.get('/api/0/subscription/list', function(req, res) {
	rs.all([db.all(db.Feed)]).then(function(results) {
		results.forEach(function(feeds) {
			return res.json(feeds);
		});
	}, function(err) {
        res.status(500).send(err);
    });
});

app.post('/api/0/subscription/search', function(req, res) {
   /*
	 * Check if URL
	 */
    if (!ut.isUrl(req.query.q)) {
        return res.json({
            query: req.query.quickadd,
            numResults: 0
        });
    }
    /*
	 * Subscribe to URL
	 */
    actions.search(req, req.query.q).then(function(feed) {
        res.json({
            query: req.query.q,
            numResults: 1,
            streamId: 'feed/' + feed.feedURL
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
		
    /*
	 * Check if URL
	 */
    if (!ut.isUrl(req.query.quickadd)) {
        return res.json({
            query: req.query.quickadd,
            numResults: 0
        });
    }

    /*
	 * Subscribe to URL
	 */
    actions.subscribe(req, req.query.quickadd).then(function() {
        res.json({
            query: req.query.quickadd,
            numResults: 1,
            streamId: 'feed/' + req.query.quickadd
        });
    }, function(err) {
        res.status(500).send(err);
    });
});
