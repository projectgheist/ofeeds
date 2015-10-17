var ex = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	mm = require('moment'),
	ut = require('../utils');

var app = module.exports = ex();

/**
 * @param posts: Array of posts to format
 * @param feed: information related to the feed 
 */
function formatPosts(user, feed, posts, tags, obj) {
	// creates a new array with the posts 
    var items = db.formatPosts(user, posts);
	//
	if (!feed && tags && tags.length > 0) {
		obj.title 	= tags[0].name;
		obj.id		= 'user/' + obj.title;
		obj.showOrigin = true;
		// can't subscribe to this feed
		obj.subscribed = -1;
	}
	// url to current api fetch call
	obj.self 		= {href: (feed ? feed.self : '')}; 
	obj.alternate 	= (feed && feed.siteURL) ? [{ href: feed.siteURL, type: 'text/html' }] : '';
	obj.items 		= items;
	//console.log('formatPosts (E)')
	if (feed) {
		for (var i in tags) {
			obj.subscribed = (feed.tags.indexOf(tags[i].id) > -1) ? 1 : 0;
			if (obj.subscribed) {
				break;
			}
		}
	}
	return obj;
};

app.get('/api/0/stream/contents*', function(req, res) {
	var streams = [];
	// validate input
	if (req.params[0]) {
		streams = ut.parseParameters(req.params[0], req.user);
	} else if (req.query) {
		if (Array.isArray(req.query)) {
			for (var i in req.query) {
				streams.push(req.query[i]);
			}
		} else {
			streams.push(req.query);
		}
	}
	if (!streams) {
        return res.status(400).send('InvalidStream');
    }
    // auth is not required for public streams (e.g. feeds)
    /*if (hasTagStreams(streams) && !utils.checkAuth(req, res))
        return;
        */
    if (req.query.n && !/^[0-9]+$/.test(req.query.n)) {
        return res.status(400).send('InvalidCount');
	}
    if (req.query.ot && !/^[0-9]+$/.test(req.query.ot)) {
        return res.status(400).send('InvalidTime');
	}
    if (req.query.nt && !/^[0-9]+$/.test(req.query.nt)) {
        return res.status(400).send('InvalidTime');
	}
    if (req.query.r && !/^[no]$/.test(req.query.r)) {
        return res.status(400).send('InvalidRank');
	}
    var excludeTags = ut.parseTags(req.query.xt, req.user);
    if (req.query.xt && !excludeTags) {
        return res.status(400).send('InvalidTag');
	}
	// load posts
    db
		.getPosts(streams, {
			excludeTags: excludeTags,
			minTime: req.query.ot || 0,
			maxTime: req.query.nt || Date.now(),
			sort: [['published',(req.query.r === 'o') ? 1 : -1],['_id',1]],
			limit: +req.query.n || 20,
			populate: ['feed','tags']
		})
		.then(function(item) {
			//console.log('stream/contents (A)')
			item.query
				.then(function(posts) {
					//console.log('stream/contents (B)')
					//console.log(posts.length)
					var isFeed 	= (streams[0].type === 'feed'), // boolean: TRUE if feed
						value 	= streams[0].value,				// string: site URL
						hasPosts = (posts.length > 0 && posts[0]), // boolean: TRUE if feed object
						feed 	= !ut.isArray(item.feeds) ? item.feeds : item.feeds[0]; // reference to feed db obj
					var obj 	= feed ? {
							id:           	encodeURIComponent(isFeed ? feed.stringID : ''),
							feedURL:		decodeURIComponent(isFeed ? feed.feedURL : value),
							title:        	isFeed ? feed.title        : value,
							description:	isFeed ? feed.description  : '',
							direction: 		'ltr',
							siteURL:      	isFeed ? feed.siteURL      : '',
							updated:      	isFeed ? feed.lastModified : '',
							self:         	ut.fullURL(req),
							creation: 		isFeed ? feed.creationTime : '',
							subscribed:		0,
							showOrigin:		false,
							continuation: 	'TODO'
						} : {};
					if (hasPosts === undefined) {
						//console.log('stream/contents (N)')
						var feedURL = ut.isArray(streams) && streams.length > 0 ? streams[0].value : undefined;
						// Google Reader returns 404 response, we need a valid json response for infinite scrolling
						res.json({
							feedURL: feedURL,
							updated: '',
							title: 'Unknown ('+feedURL+')',
							items: []
						});
					} else {
						//console.log('stream/contents (Y)')
						if (req.user) {
							return db.Tag
								.find(ut.parseTags('user/-/state/reading-list', req.user)[0])
								.then(function(tags) {
									res.json(formatPosts(req.user, feed, posts, tags, obj))
								});
						} else {
							res.json(formatPosts({}, feed, posts, [], obj))
						}
					}
				}, function(err) {
					return res.status(500).send(err);
				});
		});
});
