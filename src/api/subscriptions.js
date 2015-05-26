var ex = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	mm = require('moment'),
	cf = require('../../config'),
	ut = require('../utils');

var app = module.exports = ex();

var Agenda = require('agenda'),
	ag = new Agenda({ db: { address: ut.getDBConnectionURL(cf.db(),true), collection: 'agendaJobs' }, 
		defaultLockLifetime: 1000 
	});

// @todo: functions need to be merged
var actions = {
	/**
	 * @param url: un-encoded
	 */
	search: function(ctx, url) {
		// Find or create feed for this URL in the database
		return db.Feed
			.find({ $or: [{title: {$regex: new RegExp('.*'+url+'.*','i')}}, {feedURL: {$regex: url}}] })
			.limit(6)
			.then(function(results) {
				// feeds found that match the search expression
				if (results.length > 0) { 
					return results;
				}
				// make sure it starts with a certain prefix
				if (!ut.startsWith(url, ['http://','https://'])) {
					// add prefix to the front of the string
					url = 'http://' + url;
				}
				if (ut.isUrl(url)) {
					return db
						.findOrCreate(db.Feed, { feedURL: encodeURIComponent(url) })
						.then(cr.FetchFeed)
						.then(function(f) {
							return [f]; // return feed in array form
						});
				}
				return false;
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

// lists all of the feeds in the database
app.get('/api/0/feeds/list', function(req, res) {
	var opts = {
		// oldest feeds first
		sort: { lastModified:1 }
	};
	db
	.all(db.Feed, opts) // retrieve all feeds
	.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		var a = feeds.map(function(f) {
			var b = f.failedCrawlTime === undefined,
				s = f.successfulCrawlTime === undefined,
				r = (b && s) ? false : (!b && !s ? mm(f.successfulCrawlTime) > mm(f.failedCrawlTime) : (b && !s));
			return {
				favicon:		f.favicon || '',
				id: 			f.feedURL, // its already encoded
				postCount:		f.posts ? f.posts.length : 0,
				title: 			f.title || '',
				shortid: 		f.shortID,
				crawlTime:		f.lastModified || undefined,
				updated:		(f.posts && f.posts.length > 0) ? f.posts[f.posts.length-1].published : undefined,
				crawlSuccesful:	r
			};
		});
		ag.jobs({name: 'UpdateAllFeeds'}, function(err, jobs) {
			return res.json({'nextRunIn':(jobs.length > 0 ? jobs[0].attrs.nextRunAt : ''), 'feeds':a});
		});
	});
});

// lists all of the feeds a user is subscribed to
app.get('/api/0/subscription/list', function(req, res) {
    // is user logged in?
	if (!req.isAuthenticated()) {
		res.status(500).send('User not defined!');
	} else {
		// get tags
		var tags = ut.parseTags(['user/-/state/reading-list','user/-/state/read'], req.user),
			tuc = 0;
		return db.getTags(tags[0]).then(function(readinglist) {
			// no feeds returned
			if (!readinglist) {
				return [];
			}
			// find all feeds that contain 'reading-list' tag & sort by alphabetical title
			return rs.all([db.Feed.find({ tags: readinglist }).sort({ 'title': 1 }),db.getTags(tags[1])]);
		}).then(function(results) {
			var a = results[0].map(function(f) {
				// find posts in feed WHERE 'read'-tag 'not in' array
				return db.Post.find({ _id: {$in: f.posts}, tags: {$nin: results[1]} }).then(function(c) {
					// create array of users tags for this feed
					var categories = f.tagsForUser(req.user).map(function(tag) {
						return {
							id: 	tag.stringID,
							label: 	tag.name
						};
					});
					// increment total unread count
					tuc += c.length;
					return {
						favicon:		f.favicon,
						id: 			encodeURIComponent(['feed/',f.feedURL].join('')),
						title: 			f.titleForUser(req.user),
						unreadcount: 	c.length,
						shortid: 		f.shortID,
						categories: 	categories,
						crawlTime:		f.successfulCrawlTime,
						updated:		f.lastModified
					};
				}, function(err) {
				});
			});
			return rs.all(a);			
		}).then(function(s) {
			// add separate reading-list element
			s.push({id:encodeURIComponent('label/reading-list'),unreadcount:tuc});
			// return json value
			return res.json(s);
		}, function(err) {
			res.status(500).send(err);
		});
	}
});

// search for feeds and preview them before adding them to their account
app.get('/api/0/subscription/search', function(req, res) {
	// create or find URL in db
    actions
		.search(req, req.query.q)
		.then(function(feeds) {
			var vs = [];
			if (feeds) {
				for (var i in feeds) {
					var d = feeds[i].description;
					vs.push({
						type:'feed',
						value:feeds[i].feedURL,
						title:feeds[i].title,
						description:(d ? (d.length < 32 ? d : (d.substring(0, 28) + ' ...')) : '')
						});
				};
			}
			// always return something, don't make it return errors
			res.json(vs);
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

// subscribe to feed
app.post('/api/0/subscription/quickadd', function(req, res) {
   	// is user logged in?
	if (!req.isAuthenticated()) {
        return;
	}
	var u = decodeURIComponent(req.query.q);
	if (!ut.startsWith(u, ['http://','https://'])) {
		u = 'http://' + u;
	}
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