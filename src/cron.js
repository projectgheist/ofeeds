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
	ag = new Agenda({ db: { address: ut.getDBConnectionURL(cf.db(),true), collection: 'agendaJobs' }, 
		defaultLockLifetime: 1000 
	});

exports.setup = function() {
	//console.log("// ----------------------------------------------------------------------------");
	// purge all unreferenced jobs from db
	ag.purge(function(err, numRemoved) {
		//console.log('Amount of unreferenced jobs removed: ' + numRemoved);
	});

	// clear all pre-existing 'UpdateAllFeeds' jobs
	ag.cancel({name: 'UpdateAllFeeds'}, function(err, numRemoved) {
		//console.log("Amount of 'UpdateAllFeeds' jobs removed: " + numRemoved);
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
	this.small = {};
	this.large = {};
	this.other = [];
}

exports.FindOrCreatePost = function(feed,guid,data) {
    // return a new promise
	return new rs.Promise(function(rslv,rjct) {
        // find post in database
		st
        .findOrCreate(st.Post, {'feed':feed, 'guid':guid})
        .then(function(post) {
			post.guid		= guid;
			post.title 		= ut.parseHtmlEntities(data.title || '');
			post.body		= data.description || '';
			post.summary	= (data.summary !== data.description) ? data.summary : '';
			post.images		= data.images || {};
			post.videos		= data.videos || [];
			post.url		= data.link || '';
			post.author		= data.author || '';
			post.commentsURL= data.comments || '';
			post.categories = data.categories || [];
			post.feed		= feed;
			// prevent the publish date to be overridden
			if (!post.published) {
				post.published = data.pubdate || mm();
			}
			// if feeds post variable doesn't exist, make it an array
			feed.posts || (feed.posts = []);
			// add post to posts array
			feed.posts.addToSet(post);
			// return succesfully
			rslv(post.save());
		}, function(err) {
			//console.log("ERROR!"+err);
			rjct(err);
		});
	});
};

exports.RetrievePosts = function(posts, feed, stream) {
	// data contains all the post information
	var data;
	while (data = stream.read()) {
		var images = new ContainerImages(),
			videos = [];
		// Store orignal thumbnail url
		images.small = (data.image !== undefined && data.image.url && data.image.url.length > 0) ? {'url':data.image.url,'width':data.image.width || 0,'height':data.image.height || 0} : undefined;
		if (data['media:thumbnail'] !== null || data['media:content'] !== null) {
			var media = [data['media:thumbnail'],data['media:content']];
			// loop array
			for (var j in media) {
				// local reference to array element
				var obj = media[j];
				// if not a valid object
				if (!obj) {
					continue;
				}
				// convert object to array if it isn't already
				if (!Array.isArray(obj)) {
					obj = [obj];
				}
				// NOTE: don't assume that integers are integers, they could actually be strings
				for (var i in obj) {
					// early out
					if (obj[i]['@'].medium && obj[i]['@'].medium === 'document') {
						continue;
					}
					// store image regardless of size
					images.other.push(obj[i]['@']);
					// early out
					if (obj[i]['@'].width === 0) {
						continue;
					}
					// get the smallest image
					if (!images.small || !images.small.width || (parseInt(images.small.width) > parseInt(obj[i]['@'].width))) {
						images.small = obj[i]['@'];
					}
					// get the largest
					if (!images.large || !images.large.width || (parseInt(images.large.width) < parseInt(obj[i]['@'].width))) {
						images.large = obj[i]['@'];
					}
				}
			}
		}
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
					// create new image object
					var obj = {'url':tag.attributes.SRC,'width':tag.attributes.WIDTH || 0,'height':tag.attributes.HEIGHT || 0}
						found = false;
					// check if image already exists in list
					for (var i in images.other) {
						if (images.other[i].url === obj.url) {
							found = true;
							break; // stop for-loop
						}
					}
					// image was already added
					if (found) {
						break; // stop switch-statement
					}
					// add to images array
					images.other.push(obj);
					// store small image
					if (!images.small || !images.small.width) {
						images.small = obj;
					}
					// store large image
					if (!images.large || !images.large.width) {
						images.large = obj;
					}
					break;
				case 'A':
					//console.log('a:'+tag.attributes.HREF);
					break;
				case 'IFRAME':
					// add video url to array
					videos.push(tag.attributes.SRC);
					break;
				}
			}
			// Parse the post description for image/video tags
			pr.write(data.description.toString("utf8")).end();
		}
		// store images in object
		data.images = images;
		// store videos in object
		data.videos = videos;
		// add
		posts.push(exports.FindOrCreatePost(feed,(data.guid || data.link),data));
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
			console.log("Updated feed!");
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
	/*if (!feed ||
		(feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') <= 1)) { // feed was updated less then 2 minutes ago
		return new rs.Promise(function(resolve, reject) { 
			resolve(feed); 
		});
	}*/
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
				return exports.DeleteFeed(feed,(err || 'Bad status code'), reject);
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
					exports.DeleteFeed(feed,error,reject);
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
	opts.limit 	= 15;
	// do database related things
	st
	.all(st.Feed, opts) // retrieve all feeds
	.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		console.log("Start cron jobs!");
		var a = [];
		// loop all found feeds
		for (var i in feeds) {
			if (feeds[i].feedURL === undefined) {
				//console.log("Remove feed: "+feeds[i].feedURL);
				a.push(feeds[i].remove());
			} else {
				console.log("Fetch feed: "+feeds[i].feedURL);
				a.push(exports.FetchFeed(feeds[i]));
			}
		}
		if (a.length > 0) {
			console.log("Update feed count: " + a.length);
			rs.all(a).then(function() {
				console.log("All feeds were updated succesfully!");
				done();
			}, function(err) {
				//console.log("Cron job error: "+err);
				done();
			});
		} else {
			console.log("No functions to execute!");
			done();
		}
	});
};