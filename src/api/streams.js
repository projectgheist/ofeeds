 var express = require('express'),
	rs = require('rsvp'),
	db = require('../storage'),
	cr = require('../cron'),
	ut = require('../utils');

var app = module.exports = express();

app.get('/api/0/stream/contents/*', function(req, res) {
	// validate input
    var streams = ut.parseParameters(req.params[0], undefined);
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
    /*if (req.query.xt && !excludeTags)
        return res.status(400).send('InvalidTag');
	*/	
    // load posts
    db.postsForStreams(streams, {
        excludeTags: excludeTags,
        minTime: req.query.ot,
        maxTime: req.query.nt,
        sort: (req.query.r === 'o') ? 'published' : '-published',
        limit: +req.query.n || 20,
        populate: 'feed'
    }).then(function(posts) {
        // Google Reader returns a 404 for unknown feeds
        if (posts.length === 0 && streams[0].type === 'feed')
			return res.status(404).send(FeedNotFound);
        
        var isFeed = (streams[0].type === 'feed');
        var value = streams[0].value;
        var feed = posts[0] && posts[0].feed;
        
        // TODO: atom output
        res.json(generateFeed(posts, {
            id:           isFeed ? feed.stringID     : 'user/' + req.user.id + '/' + value.type + '/' + value.name,
            title:        isFeed ? feed.title        : value.name,
            description:  isFeed ? feed.description  : undefined,
            siteURL:      isFeed ? feed.siteURL      : undefined,
            updated:      isFeed ? feed.lastModified : Date.now(),
            self:         utils.fullURL(req),
            continuation: 'TODO'
        }));
    }, function(err) {
        return res.status(500).send(err);
    });
});
