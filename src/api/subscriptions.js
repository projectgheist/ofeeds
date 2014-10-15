 var express = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	ut = require('../utils');

var app = module.exports = express();

var actions = {
    subscribe: function(ctx, url) {
		console.log("Subscribe action: " + url);
        // Find or create feed for this URL in the database
        var feed = db.findOrCreate(db.Feed, {feedURL: url});
		// wait for all results to return before continuing
        return rs.all([feed]).then(function(results) {
			// local ref to feed variable
            var feed = results[0];
            // If this feed was just added, start a high priority job to fetch it
            if (feed.numSubscribers === 0) {
				return cr.FetchFeed(feed).then(function() {
					console.log("Finish fetch");
				});
            }
			return true;
        });
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
