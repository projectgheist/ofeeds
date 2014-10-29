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
function formatPosts(feed, posts, tags, obj) {
	// creates a new array with the posts 
    var items = posts.map(function(post) {
		var tags = post.tags.map(function(t) {
			return t.stringID;
        });
        return {
            id: post.shortID,
            title: post.title,
            alternate: {
                href: post.url,
                type: 'text/html'
            },
            content: {
                direction: 'ltr',
                content: post.body,
				images: post.images,
				videos: post.videos
            },
            author: post.author,
            published: (mm().diff(mm(post.published), 'days') <= 7 ? mm(post.published).fromNow() : mm(post.published).format("D MMM")) || 0,
            updated: post.updated || 0,
            categories: tags.concat(post.categories),
            origin: {
                streamId: post.feed.stringID,
                title: post.feed.title,
                url: post.feed.feedURL
            },
            crawlTimeMsec: post.feed.successfulCrawlTime.getTime(),
            timestampUsec: post.published.getTime(),
            likingUsers: [],
            comments: [],
            annotations: []
        };
    });
	if (!feed && tags) {
		obj.id		= 'user/' + tags[0].name;
		obj.title 	= tags[0].name;
	}
	obj.self 		= {href: (feed ? feed.self : '')}; // url to current api fetch call
	obj.alternate 	= (feed && feed.siteURL) ? [{ href: feed.siteURL, type: 'text/html' }] : '';
	obj.items 		= items;
	if (feed) {
		for (var i in tags) {
			obj.subscribed = (feed.tags.indexOf(tags[i].id) > -1);
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
    if (req.query.n && !/^[0-9]+$/.test(req.query.n))
        return res.status(400).send('InvalidCount');
        
    if (req.query.ot && !/^[0-9]+$/.test(req.query.ot))
        return res.status(400).send('InvalidTime');
        
    if (req.query.nt && !/^[0-9]+$/.test(req.query.nt))
        return res.status(400).send('InvalidTime');
        
    if (req.query.r && !/^[no]$/.test(req.query.r))
        return res.status(400).send('InvalidRank');
    
    var excludeTags = ut.parseTags(req.query.xt, req.user);
    if (req.query.xt && !excludeTags)
        return res.status(400).send('InvalidTag');

	// load posts
    db.getPosts(streams, {
        excludeTags: excludeTags,
        minTime: req.query.ot,
        maxTime: req.query.nt,
        sort: (req.query.r === 'o') ? 'published' : '-published',
        limit: +req.query.n || 20,
        populate: 'feed'
    }).then(function(posts) {
		var isFeed 	= (streams[0].type === 'feed'), // boolean: TRUE if feed
			value 	= streams[0].value,				// string: site URL
			hasPosts = (posts.length > 0 && posts[0]), 					// boolean: TRUE if feed object
			feed 	= (isFeed && hasPosts) ? posts[0].feed : undefined,	// reference to feed db obj
			obj 	= {
				id:           	encodeURIComponent(isFeed ? feed.stringID : ''),
				feedURL:		decodeURIComponent(isFeed ? feed.feedURL : value),
				title:        	isFeed ? feed.title        : value,
				description:	isFeed ? feed.description  : '',
				direction: 		'ltr',
				siteURL:      	isFeed ? feed.siteURL      : '',
				updated:      	mm(isFeed ? feed.lastModified : Date.now()).format('dddd, MMMM Do YYYY, h:mm:ss A'),
				self:         	ut.fullURL(req),
				subscribed:		false,
				continuation: 	'TODO'
			};
        if (!hasPosts) {
			// Google Reader returns 404 response, we need a valid json response for infinite scrolling
			res.json(obj);
        } else {
			if (req.user) {
				var r = ut.parseTags('user/-/state/reading-list', req.user)[0];
				return db.Tag.find(r).then(function(tags) {
					res.json(formatPosts(feed, posts, tags, obj))
				});
			} else {
				res.json(formatPosts(feed, posts, [], obj))
			}
		}
    }, function(err) {
        return res.status(500).send(err);
    });
});
