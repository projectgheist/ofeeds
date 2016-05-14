var ap = require('../app');
var rs = require('rsvp');
var db = require('../storage');
var cr = require('../cron');
var mm = require('moment');
var ut = require('../utils');
var ag = require('../wait');

/** function search
 * @param url: encoded
 */
exports.search = function (url, debug) {
	// decode url for title search
	var actualURL = decodeURIComponent(url);
	// Find or create feed for this URL in the database
	return db.Feed
		.find({
			$or: [{
				title: { $regex: new RegExp('.*' + actualURL + '.*', 'i') }
			}, {
				feedURL: { $regex: url }
			}]
		})
		.limit(6)
		.then(function (results) {
			// feeds found that match the search expression (used by typeahead)
			if (results.length > 0) {
				return results;
			}
			// make sure it starts with a certain prefix (isn't necessary for find)
			if (!ut.startsWith(actualURL, ['http://', 'https://'])) {
				// add prefix to the front of the string
				actualURL = 'http://' + actualURL;
			}
			// is valid url?
			if (ut.isUrl(actualURL)) {
				return db
					.findOrCreate(db.Feed, { feedURL: encodeURIComponent(actualURL) })
					.then(function (feed) {
						// retrieve all posts of the feed
						return cr.FetchFeed(feed, debug);
					})
					.then(function (f) {
						// return feed as array
						return [f];
					});
			} else {
				return [];
			}
		});
};

// @todo: functions need to be merged
var actions = {
	/** function refresh
	 * @param url: encoded
	 */
	refresh: function (ctx, url) {
		// Find feed for this URL in the database
		return db.Feed
			.find({ feedURL: url })
			.then(function (feed) {
				return feed.length ? cr.FetchFeed(ut.arrayToObject(feed)) : false;
			});
	},
	/** function subscribe
	 * @param url: encoded
	 */
	subscribe: function (ctx, url) {
		// Find or create feed for this URL in the database
		var feed = db.Feed.find({ feedURL: url });
		// Find or create a tag to add this feed to the users reading-list
		var tag = db.findOrCreate(db.Tag, ut.parseTags('user/-/state/reading-list', ctx.user)[0]);
		// wait for all results to return before continuing
		return rs
			.all([feed, tag])
			.then(function (results) {
				// local ref to feed and tag variable
				var f = ut.arrayToObject(results[0]);
				var t = results[1];
				// Invalid feed or tag
				if (!f || !t) {
					return {};
				}
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

/** function AllFeeds
 */
function AllFeeds (req, res) {
	var s;
	if (!req.query.r) {
		s = {title: 1}; // alphabetical
	} else {
		switch (req.query.r) {
		case 'n':
			s = {lastModified: 1}; // newest first
			break;
		case 'o':
			s = {lastModified: -1}; // oldest first
			break;
		case 's': // number of subscribers
			s = [
				['numSubscribers', -1], // highest number first
				['title', 1] // alphabetical
			];
			break;
		case 'a': // creation time
			s = {creationTime: -1}; // newest feed first
			break;
		default:
			s = {lastModified: 1}; // newest first
			break;
		}
	}
	// retrieve all feeds
	return db
		.all(db.Feed, {
			// sort argument for the retrieved feeds
			sort: s,
			// limit the amount of output feeds
			limit: parseInt(req.query.n, 10) || false
		})
		.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
		.then(function (feeds) {
			var a = feeds.map(function (f) {
				var b = f.failedCrawlTime === undefined;
				var s = f.successfulCrawlTime === undefined;
				var r = (b && s) ? false : ((!b && !s) ? (mm(f.successfulCrawlTime) > mm(f.failedCrawlTime)) : (b && !s));
				return {
					favicon: f.favicon || '',
					id: f.feedURL, // its already encoded
					postCount: (f.posts ? f.posts.length : 0),
					title: f.title || decodeURIComponent(f.feedURL),
					shortid: f.shortID,
					crawlTime: f.successfulCrawlTime || undefined,
					updated: f.lastModified || undefined,
					crawlSuccesful: r,
					creation: f.creationTime
				};
			});
			// retrieve the time till the next job needs to run
			ag
				.getAllJobs()
				.then(function (jobs) {
					var obj = {
						'nextRunIn': ((jobs.length > 0) ? jobs[0].attrs.nextRunAt : ''),
						'feeds': a
					};
					return res.json(obj);
				});
		});
}

// lists all of the feeds in the database
ap.get('/api/0/feeds/list', AllFeeds);

/**
 * lists all of the feeds in the database
 * @returns {object}
 */
ap.post('/api/0/feed/title', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		res.status(401).end();
	} else if (!req.body.q || !req.body.n) {
		res.status(400).end();
	} else {
		db
			.getTags(ut.parseTags('user/-/state/reading-list', req.user))
			.then(function (c) {
				return db.Feed.find({
					tags: { $in: c },
					feedURL: req.body.q
				});
			})
			.then(function (a) {
				// check for valid find
				if (!a.length) {
					return {};
				}
				// local reference
				var ref = ut.arrayToObject(a);
				// set name and store in database
				return ref.setTitleForUser(req.body.n, req.user).save();
			})
			.then(function (b) {
				res.json(b);
			});
	}
});

// lists all of the feeds a user is subscribed to
ap.get('/api/0/subscription/list', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		return AllFeeds(req, res);
	} else {
		// total post unread count
		var tuc = 0;
		return db
			.getTags(ut.parseTags('user/-/state/reading-list', req.user))
			.then(function (tagsArray) {
				// valid tags found?
				if (tagsArray.length) {
					// find all feeds that contain 'reading-list' tag & sort by alphabetical title
					return rs.all([
						db.Feed.find({ tags: ut.arrayToObject(tagsArray) }).sort({ 'title': 1 }),
						db.getTags(ut.parseTags('user/-/state/read', req.user))
					]);
				}
				// no tags found, return empty array
				return [];
			})
			.then(function (results) {
				// no feeds to process, next
				if (!results.length) {
					return [];
				}
				// variables for reading list and read tag
				var readingList = results[0];
				var readTag = results[1];
				// create array of promises
				var a = readingList.map(function (feed) {
					// find posts in feed WHERE 'read'-tag 'not in' array
					return db.Post
						.find({
							_id: { $in: feed.posts },
							tags: { $nin: readTag }
						})
						.then(function (c) {
							// increment total unread count
							tuc += c.length;
							// create object
							return {
								favicon: feed.favicon,
								id: encodeURIComponent(['feed/', feed.feedURL].join('')),
								title: feed.titleForUser(req.user),
								unreadcount: c.length,
								shortid: feed.shortID,
								crawlTime: feed.successfulCrawlTime,
								updated: feed.lastModified,
								creation: feed.creationTime
							};
						});
				});
				return rs.all(a);
			})
			.then(function (formattedFeeds) {
				// add separate reading-list element
				formattedFeeds.push({
					id: encodeURIComponent('label/reading-list'),
					unreadcount: tuc
				});
				// return json value
				return res.json({
					'feeds': formattedFeeds
				});
			});
	}
});

// search for feeds and preview them before adding them to their account
ap.get('/api/0/subscription/search', function (req, res) {
	if (!req.query.q) {
		res.status(400).end();
	} else {
		// create or find URL in db
		exports
			.search(req.query.q)
			.then(function (feeds) {
				if (feeds.length) {
					var a = feeds.map(function (val) {
						var d = val.description;
						return {
							type: 'feed',
							value: val.feedURL,
							title: val.title,
							description: (d ? (d.length < 32 ? d : (d.substring(0, 28) + ' ...')) : ''),
							alert: 'success'
						};
					});
					res.status(200).json(a);
				} else {
					res.status(200).json({
						type: 'feed',
						value: req.query.q,
						title: 'NotAFeed',
						description: '',
						alert: 'danger'
					});
				}
			});
	}
});

// fetch a feed
ap.get('/api/0/subscription/refresh', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		res.status(401).end();
	} else if (!req.query.q) {
		res.status(400).end();
	} else {
		// create or find URL in db
		actions
			.refresh(req, req.query.q)
			.then(function (feed) {
				res.status(200).json({
					query: decodeURIComponent(req.query.q),
					numResults: feed ? 1 : 0,
					streamId: feed ? feed.stringID : ''
				});
			});
	}
});

/** subscribe to feed
	@params q = encoded RSS URL
*/
ap.post('/api/0/subscription/quickadd', function (req, res) {
	// is user logged in?
	if (!req.isAuthenticated()) {
		res.status(401).end();
	} else if (!req.body.q) {
		res.status(400).end();
	} else {
		// creat or find URL in db
		actions
			.subscribe(req, req.body.q)
			.then(function (feed) {
				var isValid = !ut.isEmpty(feed);
				res.json({
					query: decodeURIComponent(req.body.q),
					numResults: isValid ? 1 : 0,
					streamId: isValid ? feed.stringID : ''
				});
			});
	}
});
