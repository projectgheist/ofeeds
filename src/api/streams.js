var ap = require('../app');
var db = require('../storage');
var ut = require('../utils');
var mm = require('moment');

/** function formatPosts
 * @param posts: Array of posts to format
 * @param feed: information related to the feed
 */
function formatPosts (user, feed, posts, tags, obj) {
	// creates a new array with the posts
	var items = db.formatPosts(user, posts);
	if (!feed) {
		if (tags && tags.length > 0) {
			obj.title = tags[0].name;
			obj.id = 'user/' + obj.title;
			obj.showOrigin = true;
			// can't subscribe to this feed
			obj.subscribed = -1;
		}
	} else {
		for (var i in tags) {
			obj.subscribed = (feed.tags.indexOf(tags[i].id) > -1) ? 1 : 0;
			// If subscribed is flagged, break
			if (obj.subscribed) {
				break;
			}
		}
	}
	// url to current api fetch call
	obj.self = {href: (feed ? feed.self : '')};
	obj.alternate = (feed && feed.siteURL) ? [{ href: feed.siteURL, type: 'text/html' }] : '';
	obj.items = items;
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
					// console.log('stream/contents (B)')
					var isFeed = (params.type === 'feed'); // boolean: TRUE if feed
					var value = params.value; // string: site URL
					var hasPosts = (posts.length > 0 && posts[0]); // boolean: TRUE if feed object
					var feed = !ut.isArray(item.feeds) ? item.feeds : item.feeds[0]; // reference to feed db obj
					if (!feed) {
						return res.status(400).send('No feed retrieved!');
					}
					var obj = {
						id: encodeURIComponent(isFeed ? feed.stringID : ''),
						feedURL: decodeURIComponent(isFeed ? feed.feedURL : value),
						title: isFeed ? feed.title : value,
						description: isFeed ? feed.description : '',
						direction: 'ltr',
						siteURL: isFeed ? feed.siteURL : '',
						updated: isFeed ? feed.lastModified : '',
						self: ut.fullURL(req),
						creation: isFeed ? feed.creationTime : '',
						subscribed: 0,
						showOrigin: false,
						continuation: 'TODO'
					};
					if (hasPosts === undefined) {
						// Google Reader returns 404 response, we need a valid json response for infinite scrolling
						return res.json({
							feedURL: value,
							updated: '',
							title: 'Unknown (' + value + ')',
							items: []
						});
					} else {
						// console.log('stream/contents (Y)')
						if (req.user) {
							return db
								.getTags(ut.parseTags('user/-/state/reading-list', req.user))
								.then(function (tags) {
									return res.json(formatPosts(req.user, feed, posts, tags, obj));
								});
						} else {
							return res.json(formatPosts({}, feed, posts, [], obj));
						}
					}
				}, function (ignore) {
					return res.status(500).end();
				});
		});
});
