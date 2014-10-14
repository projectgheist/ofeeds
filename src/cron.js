/** Includes
 */
var fp = require('feedparser'),
	rq = require('request'),
	rs = require('rsvp'),
	sx = require("../node_modules/feedparser/node_modules/sax/lib/sax.js"),
	cf = require('../config'),
	st = require('./storage'),
	ut = require('./utils'),
	mm = require('moment'),
	fd = st.Feed;
	
var Agenda = require('agenda'),
	ag = new Agenda({ db: { address: ut.GetDBConnectionURL(cf.db) } });
	
/*module.exports = function() {
	ag.every('* /5 * * * *', 'UpdateAllFeeds');
	ag.start();
};*/

function ContainerImages() {
	var small, large;
	var other;
}

/*
 * function FetchFeed
 */
exports.FetchFeed = function(feed) {
	console.log()
	// early escape if no feed is returned 
	if (!feed ||
		(feed.successfulCrawlTime !== undefined && mm(feed.successfulCrawlTime).diff(mm(), 'minutes') <= 1)) { // feed was updated less then 2 minutes ago
		return;
	}
	
	console.log("\nFetch feed: " + feed.feedURL + "\n");
	
	return new rs.Promise(function(resolve, reject) {
		// save found posts to array
		var existingPosts = {};
		feed.posts.forEach(function(post) {
			existingPosts[post.guid] = post;
		});

		// pre-define variables
		var parseError = false,
			posts = [],
			parser = sx.parser(false);
		
		rq(feed.feedURL)
		.pipe(new fp()) // fetch data from feed URL
		.on('error', function(error) {
			// always handle errors
			parseError = true;
			console.log("\tFeedparser: " + error);
		})
		.on('meta', function(meta) {
			feed.title = meta.title;
			feed.description = meta.description;
			feed.author = meta.author;
			feed.language = meta.language;
			feed.copywrite = meta.copywrite;
			feed.categories = meta.categories;
			
			feed.siteURL = meta.link;
			if (meta.xmlurl) {
				feed.feedURL = meta.xmlurl;
			}
			switch (meta.cloud.type) {
				case 'hub':      // pubsubhubbub supported
				case 'rsscloud': // rsscloud supported
			}
		})
		.on('readable', function () {
			// do something else, then do the next thing
			var stream = this, 
				data;
			
			while (data = stream.read()) {
				var guid = data.guid || data.link,
					thumbnail_obj = new ContainerImages();
					
				// Store orignal thumbnail url
				thumbnail_obj.small = (data.image !== undefined) ? data.image.url : undefined;
				
				// Retrieve all the images from the post description
				if (data.description !== null) {
					parser.onopentag = function(tag) {
						// Image tag found in description
						if (tag.name === "IMG") {
							// If image is specified as the thumbnail in the post, and no previous 
							// thumbnail image was found, store as large thumbnail
							if (tag.attributes.ALT === "thumbnail" && thumbnail_obj.large === "") {
								thumbnail_obj.large = tag.attributes.SRC;
							} else {
								thumbnail_obj.other.push(tag.attributes.SRC);
							}
						}
					}
					// Parse the post description for image/video tags
					parser.write(data.description.toString("utf8")).end();
				}
				
				if (!existingPosts[guid]) {
					var post = new Post({
						feed: feed,
						guid: guid,
						title: data.title,
						body: data.description,
						summary: (data.summary !== data.description) ? data.summary : undefined,
						images: thumbnail_obj,
						url: data.link,
						published: data.pubdate,
						updated: data.date,
						author: data.author,
						commentsURL: data.comments,
						categories: data.categories
					});
					
					feed.posts.push(post);
					posts.push(post.save());
				}
			}
			
			// TODO: check for updates to existing posts
		})
		.on('end', function() {
			// wait for posts to finish saving
			// then mark crawl success or failure
			rs.all(posts).then(function() {
				feed.successfulCrawlTime = new Date();			
				feed.save();
				resolve();
			}, function(err) {
				parser.removeAllListeners('article');
				feed.failedCrawlTime = new Date();
				feed.lastFailureWasParseFailure = parseError;
				feed.save();
				reject(err);
			});
		});
	});
};

/*
 * function UpdateAllFeeds
 */
ag.define('UpdateAllFeeds', function(job, done) {
	fd
	.findById(job.data.feedID) 	// db call
	.populate('posts')			// db call 
	.then(FetchFeed);
});
