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
function formatPosts(posts, feed) {
	// creates a new array with the posts 
    var items = posts.map(function(post) {
		var tags = post.tags.map(function(tag) {
			return tag.stringID;
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
            crawlTimeMsec: '' + (+post.feed.successfulCrawlTime),
            timestampUsec: post.published.getTime(),
            likingUsers: [],
            comments: [],
            annotations: []
        };
    });

	feed.self = 	{ href: feed.self }; // url to current api fetch call
	feed.alternate = feed.siteURL ? [{ href: feed.siteURL, type: 'text/html' }] : undefined;
	feed.items = 	items;
	
    return feed;
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
			feedFound = (isFeed && posts.length > 0 && posts[0]), 	// boolean: TRUE if feed object
			feed 	= feedFound ? posts[0].feed : undefined, 		// reference to feed db obj
			feedObj = {
				id:           	encodeURIComponent(feedFound ? feed.stringID     : ('user/' + (req.user.id || '-') + '/' + streams[0].type + '/' + value)),
				title:        	feedFound ? feed.title        : value,
				description:	feedFound ? feed.description  : '',
				direction: 		'ltr',
				siteURL:      	feedFound ? feed.siteURL      : value,
				updated:      	mm(feedFound ? feed.lastModified : Date.now()).format('dddd, MMMM Do YYYY, h:mm:ss A'),
				self:         	ut.fullURL(req),
				continuation: 	'TODO'
			};
			
        if (!feedFound) {
			// Google Reader returns 404 response, we need a valid json response for infinite scrolling
			res.json(feedObj);
        } else {
			// @todo: atom output
			res.json(formatPosts(posts, feedObj));
		}
    }, function(err) {
        return res.status(500).send(err);
    });
});
