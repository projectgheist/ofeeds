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
	ag.every('15 minutes','UpdateAllFeeds');

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
	// early escape if no feed is returned 
	if (!feed ||
		(feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') <= 5)) { // feed was updated less then 2 minutes ago
		return new rs.Promise(function(resolve, reject) { 
			resolve(feed); 
		});
	}
	
	return new rs.Promise(function(resolve, reject) {
		// pre-define variables
		var parseError = false,
			postInfo = [],
			posts = [],
			parser = sx.parser(false);

		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		rq.get(decodeURIComponent(feed.feedURL),{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'}})
		.pipe(new fp()) // fetch data from feed URL
		.on('error', function(error) {
			console.log("// ----------------------------------------------------------------------------");
			console.log("Feedparser: " + error);
			console.log("\ton '" + decodeURIComponent(feed.feedURL) + "'");
			// check if we could get the feed before
			if (!feed.lastModified) {
				// remove feed from db
				feed.remove();
				// return error
				reject(error);
				return false;
			} else {
				// always handle errors
				parseError = true;
			}
		})
		.on('meta', function(meta) {
			//if (meta.xmlurl) {
			//	feed.feedURL = meta.xmlurl;
			//}

			feed.siteURL = meta.link;
			feed.title = meta.title;
			feed.description = meta.description;
			feed.author = meta.author;
			feed.language = meta.language;
			feed.copywrite = meta.copywrite;
			feed.categories = meta.categories;
			
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
						if (tag.name === "IMG" && tag.attributes) {
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
				// add image data to storage object
				data.images = thumbnail_obj;
				// link in feed
				data.feed = feed;
				// store copy of data in array
				postInfo.push(data);
			}
			// @todo: check for updates to existing posts
		})
		.on('end', function() {
			if (parseError) {
				reject('Feed parse error!');
			} else {
				var np = function(d) {
					return new rs.Promise(function(rslv,rjct) {
						st.findOrCreate(st.Post, {'feed': d.feed, 'guid': (d.guid || d.link)}).then(function(r) {
							r.title 		= d.title;
							r.body			= d.description;
							r.summary		= (d.summary !== d.description) ? d.summary : undefined;
							r.images		= d.images;
							r.url			= d.link;
							// prevent the publish date to be overridden
							if (!r.published) {
								r.published = d.pubdate || mm();
							}
							r.updated 		= d.date || mm();
							r.author		= d.author;
							r.commentsURL	= d.comments;
							r.categories 	= d.categories;
							r.feed			= d.feed;
							r.guid			= (d.guid || d.link);
							r.save();
							//
							feed.posts.addToSet(r);
							//
							rslv(r);
						}, rjct);
					});
				};
				posts = postInfo.map(function(i) {
					return np(i);
				});
				// wait for posts to finish saving
				// then mark crawl success or failure
				rs.all(posts).then(function() {
					feed.lastModified = feed.successfulCrawlTime = new Date();			
					//console.log('feed sucessfully finished');
					resolve(feed);
				}, function(err) {
					feed.lastModified = feed.failedCrawlTime = new Date();
					feed.lastFailureWasParseFailure = parseError;
					// update db
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
