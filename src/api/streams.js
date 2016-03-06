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
	//
	if (!feed && tags && tags.length > 0) {
		obj.title = tags[0].name;
		obj.id = 'user/' + obj.title;
		obj.showOrigin = true;
		// can't subscribe to this feed
		obj.subscribed = -1;
	}
	// url to current api fetch call
	obj.self = {href: (feed ? feed.self : '')};
	obj.alternate = (feed && feed.siteURL) ? [{ href: feed.siteURL, type: 'text/html' }] : '';
	obj.items = items;
	// console.log('formatPosts (E)')
	if (feed) {
		for (var i in tags) {
			obj.subscribed = (feed.tags.indexOf(tags[i].id) > -1) ? 1 : 0;
			if (obj.subscribed) {
				break;
			}
		}
	}
	return obj;
}

/** function retrieveStream
 */
ap.get('/api/0/stream/contents*', function (req, res) {
	if (ut.isEmpty(req.query) ||
		(req.query.n && !/^[0-9]+$/.test(req.query.n)) || // invalid count
		(req.query.ot && !mm(req.query.ot).isValid()) || // invalid time
		(req.query.nt && !mm(req.query.nt).isValid())) { // invalid time
		return res.status(400).end();
	}

	// exclude tags?
	if (req.isAuthenticated() && req.query.xt) {
		var excludeTags = ut.parseTags(req.query.xt, req.user);
		if (!excludeTags.length) {
			return res.status(400).end();
		}
	}

	var stream = req.query;

	// load posts
	db
		.getPosts([stream], {
			excludeTags: excludeTags,
			minTime: req.query.ot || 0, // old time
			maxTime: req.query.nt || Date.now(), // new time
			sort: [['published', (req.query.r === 'o') ? 1 : -1], ['_id', 1]], // -1 = Newest, 1 = oldest
			limit: +req.query.n || 20,
			populate: ['feed', 'tags']
		})
		.then(function (item) {
			item.query
				.then(function (posts) {
					// console.log('stream/contents (B)')
					var isFeed = (stream.type === 'feed'); // boolean: TRUE if feed
					var value = stream.value; // string: site URL
					var hasPosts = (posts.length > 0 && posts[0]); // boolean: TRUE if feed object
					var feed = !ut.isArray(item.feeds) ? item.feeds : item.feeds[0]; // reference to feed db obj
					if (!feed) {
						return res.status(400).end();
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
