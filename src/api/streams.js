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
		
		//console.log("// ----------------------------------------------------------------------------");
		//console.log(post);
		
        return {
            id: post.longID,
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
            timestampUsec: '' + (post.published * 1000),
            likingUsers: [],
            comments: [],
            annotations: []
        };
    });
	
    // TODO: atom output
    return {
        direction: 'ltr',
        id: feed.id,
        title: feed.title,
        description: feed.description,
        continuation: feed.continuation,
        self: { href: feed.self },
        alternate: feed.siteURL ? [{ href: feed.siteURL, type: 'text/html' }] : undefined,
        updated: feed.updated,
        items: items
    };
};

app.get('/api/0/stream/contents*', function(req, res) {
	// validate input
	var streams = ut.parseParameters(req.params[0] || req.query, undefined);
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
		var isFeed = (streams[0].type === 'feed');

        // Google Reader returns a 404 for unknown feeds
        if (posts.length === 0 && isFeed) {
			return res.status(404).send('Feed not found!');
        }
		
        var value = streams[0].value,
			feed = posts[0] && posts[0].feed;
		
		// @todo: atom output
        res.json(formatPosts(posts, {
            id:           isFeed ? feed.stringID     : 'user/' + (req.user.id || '-') + '/' + value.type + '/' + value.name,
            title:        isFeed ? feed.title        : value.name,
            description:  isFeed ? feed.description  : undefined,
            siteURL:      isFeed ? feed.siteURL      : undefined,
            updated:      isFeed ? feed.lastModified : Date.now(),
            self:         ut.fullURL(req),
            continuation: 'TODO'
        }));
    }, function(err) {
        return res.status(500).send(err);
    });
});
