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

exports.setup = function() {
	ag.every('* /5 * * * *', 'UpdateAllFeeds');
	ag.start();
};

function ContainerImages() {
	this.small = '';
	this.large = '';
	this.other = [];
}

/*
 * function FetchFeed
 */
exports.FetchFeed = function(feed) {
	// early escape if no feed is returned 
	if (!feed ||
		(feed.successfulCrawlTime !== undefined && mm().diff(feed.successfulCrawlTime, 'minutes') <= 5)) { // feed was updated less then 2 minutes ago
		console.log(["Fetch feed '",feed.feedURL,"' failed! (Updated less than", mm().diff(feed.successfulCrawlTime, 'minutes'), "minute(s) ago)"].join(" "));
		return;
	}
	
	console.log("\nFetch feed: " + feed.feedURL);

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
			console.log("\tFeedparser: " + error);
			// always handle errors
			parseError = true;
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
					// create new post object with all previously extracted information
					var post = new st.Post({
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
					// store in feeds table
					feed.posts.push(post);
					// store in posts table
					posts.push(post.save());
				}
			}
			
			// @todo: check for updates to existing posts
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

function UpdateAllFeeds(done) {
	// needs to have a database connection
    if (!mg.connection.db) {
		console.log('Not connected to a database')
		done();
	}
	console.log('Update all feeds')
	st
	.all(st.Feed)		// retrieve all feeds
	.populate('posts')	// replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		var a = [];
		for (var i in feeds) {
			a.push(exports.FetchFeed(feeds[i]));
		}
		rs.all(a).then(done); 
	});
};

/*
 * function UpdateAllFeeds
 */
ag.define('UpdateAllFeeds', function(job, done) {
	UpdateAllFeeds(done);
});

