var ap = require('../app');
var db = require('../storage');
var ut = require('../utils');
var mm = require('moment');

/** function formatPosts
 * @param posts: Array of posts to format
 * @param feed: information related to the feed
 */
function formatPosts (user, feed, posts, tags, obj) {
	if (posts.length) {
		// creates a new array with the posts
		obj.items = db.formatPosts(user, posts);
	}
	// feed exists?
	if (feed) {
		// assign tag
		for (var i in tags) {
			obj.subscribed = (feed.tags.indexOf(tags[i].id) > -1) ? 1 : 0;
			// If subscribed is flagged, break
			if (obj.subscribed) {
				break;
			}
		}
		// url to current api fetch call
		obj.self = { href: feed.self };
		obj.alternate = [{ href: feed.siteURL, type: 'text/html' }];
	}
	return obj;
}

/** function retrieveStream
 */
ap.get('/api/0/stream/contents*', function (req, res) {
	// Local reference to args
	var params = req.query || {};

	// Check for errors
	if (ut.isEmpty(params) ||
		(params.n && !/^[0-9]+$/.test(parseInt(params.n, 10))) || // invalid count
		(params.ot && !mm(parseInt(params.ot, 10)).isValid()) || // invalid time
		(params.nt && !mm(parseInt(params.nt, 10)).isValid())) { // invalid time
		return res.status(400).send('Invalid parameters provided!');
	}

	// exclude tags?
	var excludeTags = [];
	if (req.isAuthenticated() && params.xt) {
		excludeTags = ut.parseTags(params.xt, req.user);
		// No exclusion tags detected, but requested
		if (!excludeTags.length) {
			return res.status(400).send('No exclusion tags provided!');
		}
	}

	// load posts
	db
		.getPosts([params.value], {
			excludeTags: excludeTags,
			minTime: parseInt(params.ot, 10) || 0, // old time
			maxTime: parseInt(params.nt, 10) || Date.now(), // new time
			sort: [['published', (params.r === 'o') ? 1 : -1], ['_id', 1]], // -1 = Newest, 1 = oldest
			limit: +parseInt(params.n, 10) || 20,
			populate: ['feed', 'tags']
		})
		.then(function (item) {
			item.query
				.then(function (posts) {
					// string: site URL
					var value = params.value;
					var obj = {
						feedURL: value,
						title: 'Unknown (' + value + ')',
						updated: '',
						direction: 'ltr',
						self: ut.fullURL(req),
						subscribed: 0,
						continuation: 'TODO',
						showOrigin: false,
						items: []
					};
					if (params.type === 'feed') {
						// reference to feed db obj
						var feed = item.feeds[0];
						// assign variables
						obj.id = feed.stringID;
						obj.feedURL = decodeURIComponent(feed.feedURL);
						obj.title = feed.title;
						obj.siteURL = feed.siteURL;
						obj.updated = feed.lastModified;
						obj.creation = feed.creationTime;
					} else {
						obj.feedURL = decodeURIComponent(value);
						obj.showOrigin = true;
					}
					// has user?
					if (req.user) {
						return db
							.getTags(ut.parseTags('user/-/state/reading-list', req.user))
							.then(function (tags) {
								return res.json(formatPosts(req.user, feed, posts, tags, obj));
							});
					} else {
						return res.json(formatPosts({}, feed, posts, [], obj));
					}
				});
		});
});
