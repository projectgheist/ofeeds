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
	mg = require('mongoose'),
	is = require('image-size');
	
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
ag.define('UpdateAllFeeds', { lockLifeTime: 1000 }, function(job, done) {
	// needs to have a database connection
	if (mg.connection && mg.connection.db) {
		UpdateAllFeeds(done);
	} else {
		done();
	}
});

function ContainerImages() {
	this.small = -1;
	this.large = -1;
	this.other = [];
}

exports.FindImgSizes = function(images) {
	var p = [];
	for (var i = 0; i < images.length; ++i) {
		// return a new promise
		p.push(new rs.Promise(function(resolve, reject) {
			var ref = images[i];
			ref.idx = i;
			// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
			var req = rq.get({
				url: 		ref.url, 
				headers: 	{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'},
				encoding:	null // converts the body to a buffer when null
			}, function (err, res, body) {
				if (err || res.statusCode !== 200) {
					console.log('get error!: ' + err)
					resolve(ref);
				}
			});
			req.on('response', function(response) {
				var buffer = new Buffer([]),	
					dimensions = undefined;
				response.on('data',function(data) {
					if (dimensions === undefined) {
						buffer = Buffer.concat([buffer, data]);
						try {
							dimensions = is(buffer);
							ref.width = dimensions.width;
							ref.height = dimensions.height;
						} catch (err) {
						}
					}
				})
				.on('error', function(err) {
					resolve(ref);
				})
				.on('end', function() {
					resolve(ref);
				});
			});
		}));
	}
	return p;
}

exports.FindOrCreatePost = function(feed,guid,data) {
    // return a new promise
	return new rs.Promise(function(resolve, reject) {
		// retrieve images sizes
		rs.all(exports.FindImgSizes(data.images.other)).then(function(out) {
			data.images.other.length = 0; // clear array
			for (var i in out) { // resort array by index
				if (out[i].width <= 1 || out[i].height <= 1) {
					continue;
				}
				var k = out[i].idx; // copy
				delete out[i].idx; // remove key and value
				if (data.images.other.length === 0) {
					data.images.other.push(out[i]);
				} else {
					for (var j = 0; j < data.images.other.length; ++j) {
						if (k > j) continue;
						else data.images.other = data.images.other.splice(j, 0, out[i]);
					}
				}
			}
			// find post in database
			st
			.findOrCreate(st.Post, {'feed':feed, 'guid':guid})
			.then(function(post) {
				post.guid		= guid; // required
				post.title 		= ut.parseHtmlEntities(data.title || '');
				post.body		= data.description || '';
				post.summary	= (data.summary !== data.description) ? data.summary : '';
				post.images		= data.images || undefined;
				post.videos		= data.videos || undefined;
				post.url		= data.link || (data['atom:link'] && data['atom:link']['@'].href) || '';
				post.author		= data.author || '';
				post.commentsURL= data.comments || '';
				post.categories = data.categories || undefined;
				post.feed		= feed;
				// prevent the publish date to be overridden
				var pd = (data['rss:pubdate'] && data['rss:pubdate']['#']) || (data.meta && data.meta.pubdate) || data.pubdate;
				if (!post.published) {
					post.published = (mm(pd).isValid() ? mm.utc(pd) : mm()).format('YYYY-MM-DDTHH:mm:ss');
					post.updated = post.published;
				} else if (data.date && post.updated !== data.date) {
					pd = data.date;
					post.updated = (mm(pd).isValid() ? mm.utc(pd) : mm()).format('YYYY-MM-DDTHH:mm:ss');
				}
				// if feeds post variable doesn't exist, make it an array
				feed.posts || (feed.posts = []);
				// add post to posts array
				feed.posts.addToSet(post);
				// return successfully
				resolve(post.save());
			}, function(err) {
				resolve(err);
			});
		});
	});
};

exports.RetrievePosts = function(posts, guids, feed, stream) {
	// data contains all the post information
	var data;
	while (data = stream.read()) {
		var images = new ContainerImages(),
			videos = [];
		// Store original thumbnail url
		if (data.image !== undefined && data.image.url && data.image.url.length > 0) {
			images.small = {
				'url': data.image.url,
				'width': (data.image.width || 0),
				'height': (data.image.height || 0)
			};
		} else {
			images.small = undefined;
		}
		if (data['media:thumbnail'] !== null ||
			data['media:content'] !== null) {
			var media = [data['media:thumbnail'], data['media:content']];
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
					// get the smallest image
					if (!images.small || !images.small.width) {
						images.small = images.other.length - 1;
					}
					// get the largest
					if (!images.large || !images.large.width) {
						images.large = images.other.length - 1;
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
					// store as small image
					if (!images.small || !images.small.width) {
						images.small = images.other.length - 1;
					}
					// store as large image
					if (!images.large || !images.large.width) {
						images.large = images.other.length - 1;
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
		// default image container
		data.images = images;
		// store videos in object
		data.videos = videos;
		// get the GUID of the post
		var guid = (data.guid || data.link);
		// does GUID already exist?
		if (guids.indexOf(guid) > -1) {
			// create a new unique one from the article information available
			guid += ';' + (data.title || data.pubdate);
		}
		// add to array
		guids.push(guid);
		// store data as ref
		posts.push(exports.FindOrCreatePost(feed, guid, data)); // add
	}
};

/** function UpdateFeed
 */
exports.UpdateFeed = function(feed,posts,resolve) {
	// wait for posts to finish saving
	// then mark crawl success or failure
	rs.all(posts).then(function() {
		feed.lastModified = feed.successfulCrawlTime = new Date();			
		return [feed];
	}, function(err) {
		feed.lastModified = feed.failedCrawlTime = new Date();
		return [feed, e];
	}).then(function(a) {
		// return feed
		resolve(a[0].save());
	});
};

/** function DeleteFeed
 */
exports.DeleteFeed = function(feed, err, resolve) {
	// remove feed from db
	resolve(feed.remove());
	// prevent any additional code from executing
	return false;
};

/** function FetchFeed
 */
exports.FetchFeed = function(feed) {
	// early escape if no feed is returned OR if was updated really recently
	if (!feed ||
		(feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') <= 1)) { // feed was updated less then 2 minutes ago
		// return a new promise
		return new rs.Promise(function(resolve, reject) { 
			resolve(); 
		});
	}
	// return a new promise
	return new rs.Promise(function(resolve, reject) {
		// pre-define variables
		var parseError = false,
			postGUIDs = [],
			posts = [];
		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		var req = rq.get({
			timeout:	1500,
			url: 		decodeURIComponent(feed.feedURL), 
			headers: 	{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'}
		}, function (err, res, user) {
			if ((err || res.statusCode != 200) && !feed.title) {
				// remove feed from db
				resolve(feed.remove());
			}
		});
		req.on('response', function(res) {
			var stream = this;
			stream
			.pipe(new fp())
			.on('error', function(error) {
				console.log("// ----------------------------------------------------------------------------");
				console.log("// Feedparser error: " + error);
				console.log("\ton '" + decodeURIComponent(feed.feedURL) + "'");
				// always handle errors
				parseError = true;
			})
			.on('meta', function(meta) {
				//if (meta.xmlurl) {
				//	feed.feedURL = meta.xmlurl;
				//}
				feed.favicon	= meta.favicon || (meta['atom:icon'] && meta['atom:icon']['#']) || (meta.image && meta.image.url) || '';
				feed.siteURL 	= meta.link || '';
				feed.title 		= meta.title || '';
				feed.description = meta.description || '';
				feed.author 	= meta.author || '';
				feed.language 	= meta.language || '';
				feed.copywrite 	= meta.copywrite || '';
				feed.categories = meta.categories || '';
				
				switch (meta.cloud.type) {
					case 'hub':      // pubsubhubbub supported
					case 'rsscloud': // rsscloud supported
				}
			})
			.on('readable', function () {
				exports.RetrievePosts(posts, postGUIDs, feed, this);
			})
			.on('end', function() {
				if (parseError) {
					feed.lastModified = feed.failedCrawlTime = new Date();
					feed.lastFailureWasParseFailure = parseError;
					// save feed in db
					resolve(feed.save());
				} else {
					exports.UpdateFeed(feed, posts, resolve, reject);
				}
			});
		});
	});
};

/** function UpdateAllFeeds
 */
function UpdateAllFeeds(done) {
	// declare options object
	var opts = {};
	// get oldest updated feeds
	opts.query 	= {};
	// oldest feeds first
	opts.sort 	= {lastModified:1};
	// limit the amount of feeds
	opts.limit 	= 15;
	// do database related things
	st
	.all(st.Feed, opts) // retrieve all feeds
	.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
	.then(function(feeds) {
		var a = [];
		// loop all found feeds
		for (var i in feeds) {
			// make sure that the feed has a valid url
			if (feeds[i].feedURL !== undefined && feeds[i].feedURL.length > 0) {
				// add fetch feed job to array
				a.push(exports.FetchFeed(feeds[i]));
			}
		}
		// if jobs present
		if (a.length > 0) {
			// run all jobs
			rs.all(a).then(function() {
				return st.all(st.Feed,{query:{ posts: null, numSubscribers: null, lastFailureWasParseFailure: true }}).then(function(r) {
					var b = [];
					for (var i in r) {
						b.push(r[i].remove());
					}
					return rs.all(b);
				});
			}).then(function() { 
				done(); 
			});
		} else {
			done();
		}
	});
};