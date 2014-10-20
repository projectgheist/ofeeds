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
	mg = require('mongoose');
	
var Agenda = require('agenda'),
	ag = new Agenda({ db: { address: ut.getDBConnectionURL(cf.db,true), collection: 'agendaJobs' }, processEvery: '3 minute', defaultLockLifetime: 90000 });

exports.setup = function() {
	console.log("// ----------------------------------------------------------------------------");
	// purge all unreferenced jobs from db
	ag.purge(function(err, numRemoved) {
		console.log('Amount of unreferenced jobs removed: ' + numRemoved);
	});

	// clear all pre-existing 'UpdateAllFeeds' jobs
	ag.cancel({name: 'UpdateAllFeeds'}, function(err, numRemoved) {
		console.log("Amount of 'UpdateAllFeeds' jobs removed: " + numRemoved);
	});

	// set all jobs
	ag.every('5 minutes','UpdateAllFeeds');

	// set all jobs
	UpdateAllFeeds();

	// start cron jobs
	ag.start();
};

/*
 * function UpdateAllFeeds
 */
ag.define('UpdateAllFeeds', function(job, done) {
	// needs to have a database connection
	if (mg.connection.db) {
		UpdateAllFeeds(done);
	} else {
		done();
	}
});

function ContainerImages() {
	this.small = '';
	this.large = '';
	this.other = [];
}

/*
 * function FetchFeed
 */
exports.FetchFeed = function(feed) {
	console.log(feed.feedURL);
	// early escape if no feed is returned 
	if (!feed ||
		(feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') <= 5)) { // feed was updated less then 2 minutes ago
		console.log('Skip feed fetch!');
		return new rs.Promise(function(resolve, reject) { 
			resolve(["Fetch feed '",feed.feedURL,"' failed! (Updated less than ", mm().diff(feed.successfulCrawlTime, 'minutes'), " minute(s) ago)"].join("")); 
		});
	}
	console.log('Actually feed fetch!');
	return new rs.Promise(function(resolve, reject) {
		// save found posts to array
		var existingPosts = {};
		// loop all posts in feed
		feed.posts.forEach(function(post) {
			// create map with guid
			existingPosts[post.guid] = post;
		});
		
		// pre-define variables
		var parseError = false,
			posts = [],
			parser = sx.parser(false);
		
		rq(decodeURIComponent(feed.feedURL))
		.pipe(new fp()) // fetch data from feed URL
		.on('error', function(error) {
			console.log("// ----------------------------------------------------------------------------");
			console.log("Feedparser: " + error);
			console.log("on\t" + decodeURIComponent(feed.feedURL));
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
				feed.feedURL = encodeURIComponent(meta.xmlurl);
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
				var guid = (data.guid || data.link),
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
						published: data.pubdate || mm(),
						updated: data.date || mm(),
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
			if (parseError) {
				reject('Feed parse error!');
			} else {
				// wait for posts to finish saving
				// then mark crawl success or failure
				rs.all(posts).then(function() {
					feed.lastModified = feed.successfulCrawlTime = new Date();			
					feed.save();
					//console.log('feed sucessfully finished');
					resolve();
				}, function(err) {
					feed.lastModified = feed.failedCrawlTime = new Date();
					feed.lastFailureWasParseFailure = parseError;
					feed.save();
					//console('feed error finished');
					reject(err);
				});
			}
		});
	});
};

function UpdateAllFeeds(done) {
	st
	.all(st.Feed)		// retrieve all feeds
	.populate('posts')	// replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		var a = [];
		for (var i in feeds) {
			a.push(exports.FetchFeed(feeds[i]));
		}
		rs.all(a).then(function() { 
			done();
		}, function(err) {
			done();
		}); 
	});
};
