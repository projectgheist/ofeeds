/** Includes
 */
var fp = require('feedparser'),
	rq = require('request'),
	rs = require('rsvp'),
	sx = require("../node_modules/feedparser/node_modules/sax/lib/sax.js"),
	pr = sx.parser(false),
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

	// start cron jobs
	ag.start();
};

/** function UpdateAllFeeds
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

exports.FindOrCreatePost = function(feed,guid,data) {
	return new rs.Promise(function(rslv,rjct) {
		st.findOrCreate(st.Post, {'feed':feed, 'guid':guid}).then(function(post) {
			post.guid		= (data.guid || data.link);
			post.title 		= ut.parseHtmlEntities(data.title);
			post.body		= data.description;
			post.summary	= (data.summary !== data.description) ? data.summary : '';
			post.images		= data.thumbnail_obj;
			post.url		= data.link;
			post.author		= data.author;
			post.commentsURL= data.comments;
			post.categories = data.categories;
			post.feed		= feed;
			// prevent the publish date to be overridden
			if (!post.published) {
				post.published = data.pubdate || mm();
			}
			// add post to posts array
			feed.posts.addToSet(post);
			rslv(post.save());
		}, function(err) {
			rjct(err);
		});
	});
};

exports.RetrievePosts = function(posts, feed, stream) {
		// data contains all the post information
		var data;
		while (data = stream.read()) {
			var guid = (data.guid || data.link),
				thumbnail_obj = new ContainerImages();
				
			// Store orignal thumbnail url
			thumbnail_obj.small = (data.image !== undefined) ? data.image.url : undefined;
			// Retrieve all the images from the post description
			if (data.description !== null) {
				pr.onopentag = function(tag) {
					// early out
					if (!tag.attributes) {
						return;
					}
					// NOTE: tag names and attributes are all in CAPS
					switch (tag.name) {
					case 'IMG':
						// If image is specified as the thumbnail in the post, and no previous 
						// thumbnail image was found, store as large thumbnail
						if (tag.attributes.ALT === "thumbnail" && thumbnail_obj.large === "") {
							thumbnail_obj.large = tag.attributes.SRC;
						} else {
							thumbnail_obj.other.push(tag.attributes.SRC);
						}
						break;
					case 'A':
						//console.log('a:'+tag.attributes.HREF);
						break;
					}
				}
				// Parse the post description for image/video tags
				pr.write(data.description.toString("utf8")).end();
			}				
			posts.push(exports.FindOrCreatePost(feed,guid,data));
		}
};

exports.UpdateFeed = function(feed,posts,resolve,reject) {
	// wait for posts to finish saving
	// then mark crawl success or failure
	rs.all(posts).then(function() {
		feed.lastModified = feed.successfulCrawlTime = new Date();			
		return [feed];
	}, function(err) {
		feed.lastModified = feed.failedCrawlTime = new Date();
		feed.lastFailureWasParseFailure = parseError;
		return [feed, e];
	}).then(function(a) {
		// save feed in db
		a[0].save();
		// if error detected
		if (a.length > 1 && a[1]) {
			reject(a[1]);
		} else {
			// return feed
			resolve(a[0]);
		}
	});
};

exports.DeleteFeed = function(feed,err,reject) {
	// remove feed from db
	feed.remove();
	// return error
	reject(err);
	// prevent any additional code from executing
	return false;
};

/** function FetchFeed
 */
exports.FetchFeed = function(feed) {
	// early escape if no feed is returned 
	if (!feed ||
		(feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') <= 1)) { // feed was updated less then 2 minutes ago
		return new rs.Promise(function(resolve, reject) { 
			resolve(feed); 
		});
	}
	return new rs.Promise(function(resolve, reject) {
		// pre-define variables
		var parseError = false,
			posts = [];
		
		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		var req = rq.get({
			url: 		decodeURIComponent(feed.feedURL), 
			headers: 	{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'}
		}, function (err, res, user) {
			// return error
			if (err || res.statusCode != 200) {
				return exports.DeleteFeed(feed,(err || 'Bad status code'),reject);
			}
		});
		req.on('response', function(res) {
			var stream = this;
			stream.pipe(new fp())
			.on('error', function(error) {
				console.log("// ----------------------------------------------------------------------------");
				console.log("// Feedparser error: " + error);
				console.log("\ton '" + decodeURIComponent(feed.feedURL) + "'");
				// check if we could get the feed before
				if (!feed.lastModified) {
					return exports.DeleteFeed(feed,error,reject);
				} else {
					// always handle errors
					parseError = true;
				}
			})
			.on('meta', function(meta) {
				//if (meta.xmlurl) {
				//	feed.feedURL = meta.xmlurl;
				//}
				feed.favicon	= meta.favicon || (meta['atom:icon'] ? meta['atom:icon']['#'] : '');
				feed.siteURL 	= meta.link;
				feed.title 		= meta.title;
				feed.description = meta.description;
				feed.author 	= meta.author;
				feed.language 	= meta.language;
				feed.copywrite 	= meta.copywrite;
				feed.categories = meta.categories;
				
				switch (meta.cloud.type) {
					case 'hub':      // pubsubhubbub supported
					case 'rsscloud': // rsscloud supported
				}
			})
			.on('readable', function () {
				exports.RetrievePosts(posts,feed,this);
			})
			.on('end', function() {
				if (parseError) {
					reject('Feed parse error!');
				} else {
					exports.UpdateFeed(feed,posts,resolve,reject);
				}
			});
		});
	});
};

function UpdateAllFeeds(done) {
	var opts = {};
	// get oldest updated feeds
	opts.query 	= {lastModified:{$lt: new Date(mm().subtract(15, 'minutes'))}};
	// oldest feeds first
	opts.sort 	= {lastModified:1};
	// limit the amount of feeds
	opts.limit 	= 5;
	// do database related things
	st
	.all(st.Feed, opts) // retrieve all feeds
	.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		var a = [];
		for (var i in feeds) {
			if (feeds[i].feedURL === undefined) {
				a.push(feeds[i].remove());
			} else {
				a.push(exports.FetchFeed(feeds[i]));
			}
		}
		if (a.length > 0) {
			rs.all(a).then(function() { 
				done();
			}, function(err) {
				done();
			});
		} else {
			done();
		}
	});
};
