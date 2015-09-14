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
	
/**
 */
function ContainerImages() {
	this.small = [];
	this.large = [];
	this.other = [];
};

/** function FindImgSizePromise
	 Retrieve image sizes
 */
function FindImgSizePromise(image, type) {
	return new rs.Promise(function(resolve, reject) {
		// local reference
		var ref = image;
		// set image type
		ref.type = type;
		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		rq
			.get({
				url: 		ref.url, 
				headers: 	{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'},
				encoding:	null // converts the body to a buffer when null
			}, function (err, res, body) {
				if (err || res.statusCode !== 200) {
					resolve(ref);
				}
			})
			.on('response', function(response) {
				var buffer = new Buffer([]),	
					dimensions = undefined;
				response
					.on('data',function(data) {
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
	});
};

/** function FindImgSizes
	 Retrieve image sizes
 */
exports.FindImgSizes = function(images,type) {
	var p = [];
	for (var i in images.small) {
		// return a new promise
		p.push(FindImgSizePromise(images.small[i], 'small'));
	}
	for (var j in images.other) {
		// return a new promise
		p.push(FindImgSizePromise(images.other[j], 'other'));
	}
	return p;
}

/** function FindOrCreatePost
 */
exports.FindOrCreatePost = function(feed, guid, data) {
	//console.log("FindOrCreatePost (A)");
    // return a new promise
	return new rs.Promise(function(resolve, reject) {
		// retrieve images sizes
		/*rs
			.all(exports.FindImgSizes(data.images))
			.then(function(out) {
				//console.log("FindOrCreatePost (B)");
				// empty object
				data.images = {small:[],other:[]};
				// store in array
				for (var i in out) {
					if (out[i].type === 'small') {
						data.images.small.push(out[i]);
					} else {
						data.images.other.push(out[i]);
					}
				}
			})
			.then(function() {
				//console.log("FindOrCreatePost (C)");
				// find or create post in database
				return st.findOrCreate(st.Post, {'feed':feed, 'guid':guid});
			})*/
		st
			.findOrCreate(st.Post, {'feed':feed, 'guid':guid})
			.then(function(post) {
				try {
					//console.log("FindOrCreatePost (D)");
					var ref = !ut.isArray(post) ? post : post[0];
					ref.title 		= data.title ? ut.parseHtmlEntities(data.title) : '';
					ref.body		= data.description ? CleanupDescription(data.description) : '';
					ref.summary		= CleanupSummary(ref.body);
					ref.images		= data.images || undefined;
					ref.videos		= data.videos || [];
					// prevent the publish date to be overridden
					ref.published 	= SelectPublishedDate(ref, data);
					// time the post has been last modified
					ref.updated 	= mm();
					ref.author		= data.author ? data.author.trim() : '';
					ref.url			= data.link || (data['atom:link'] && data['atom:link']['@'].href) || '';
					ref.commentsURL	= data.comments || '';
					ref.categories 	= data.categories || undefined;
					// if feeds post variable doesn't exist, make it an array
					feed.posts || (feed.posts = []);
					// add post to posts array
					feed.posts.addToSet(ref);
					// return successfully
					resolve(ref.save());
				} catch(e) {
					//console.log('POST STORE ERROR: ' + e)
				}
			}, function(err) {
				feed.lastFailureWasParseFailure = true;
				resolve();
			});
	});
};

/** function SelectPublishedDate
 */
function SelectPublishedDate(prev,data,debug) {
	if (data['rss:pubdate'] && data['rss:pubdate']['#']) {
		if (debug) console.log('rss:pubdate: ' + data['rss:pubdate']['#']);
		return mm(new Date(data['rss:pubdate']['#']));
	} else if (data.pubdate) {
		if (debug) console.log('pubdate: ' + data.pubdate);
		return mm(new Date(data.pubdate));
	} else if (!prev.published && data.meta && data.meta.pubdate) {
		if (debug) console.log('meta.pubdate: ' + data.meta.pubdate);
		return mm(new Date(data.meta.pubdate));
	} else if (!prev.published) {
		if (debug) console.log('now');
		return mm();
	} else {
		if (debug) console.log('prev');
		return prev.published;
	}
}

/** function CleanupSummary
 */
function CleanupSummary(data,debug) {
	// early escape on no string
	if (!data || data.length <= 0) {
		return '';
	}
	//  remove all html tags and return
	return data
		.replace(/<br[\s\S]*?>/gi, ' ')
		.replace(/<.*?>/gi, '')
		.trim();
};

/** function CleanupDescription
 */
function CleanupDescription(data,images,debug) {
	// early escape on no string
	if (!data || data.length <= 0) {
		return '';
	}
	
	data = data
		.replace(/<\/img>|<hr>|<\/*h\d>/gi, '') // remove headings OR separator
		.replace(/<br[\s\S]*?>/gi, ' ') // remove new lines
		.replace(/(<script)[\s\S]*?(<\/script>)/gi, '') // remove scripts
		.replace(/(<iframe)[\s\S]*?(\/iframe>)/gi, ''); // remove iframes
	
	var p, // needs to be a separate variable otherwise it will be an infinite loop
		e,
		i = []; // array of image urls to remove
	
	// remove thumbnails
	if (images.small.length) i = i.concat(images.small);
	if (images.other.length) i.push(images.other[0].url);
	if (i.length) {
		p = /<img\s.*?src="(.*?)"\s*(.*?)\s*\/?>/gi;
		while (e = p.exec(data)) {
			if (debug) {
				console.log(e);
				console.log('found' + e[1]);
			}
			for (var j in i) { // loop all urls
				if (debug) console.log('comp: ' + i[j]);
				if (e[1] === i[j]) { // compare image src urls
					if (debug) console.log('removed!');
					data = data.replace(e[0], ''); // do string replace
				}
			}
		}
	}
	
	data = data
		.replace(/(<img\s)(.*?)((height|width)="1"\s*)+(.*?>)/gi, '') // remove ad images
		.replace(/<a\s?.*?>[\s\n]*<\/a>/gi, ''); // remove empty links
	
	// add new tab to all links
	p = /<a\s/gi;
	while (e = p.exec(data)) {
		data = ut.stringInsert(data, 'target="_blank"', e.index + 3);
	}
	
	// return values
	return data.trim();
};

/** function UpdateFeed
 */
exports.UpdateFeed = function(feed, posts, resolve) {
	//console.log('UpdateFeed (A)');
	// wait for posts to finish saving then mark crawl success or failure
	var ss = Date.now();
	rs
		.all(posts)
		.then(function() {
			var se = Date.now() - ss;
			//console.log("UpdateFeed (Y)");
			feed.successfulCrawlTime = new Date();
			// set new modified date
			feed.lastModified = mm();
			// save feed in db and return
			return feed.save();
		})
		.finally(function() {
			//console.log('Done - UpdateFeed: ' + feed.title)
			resolve(feed);
		})
		.catch(function(err) {
			//console.log("UpdateFeed (N): " + error);
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

/** function AllowFetch
	 if feed is valid AND if it was updated more then 2 minutes ago
 */
exports.AllowFetch = function(feed, debug) {
	return (feed && (!feed.successfulCrawlTime || (feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') > 2)));
};

/** function StoreMetaData
 */
function StoreMetaData(feed, meta) {
	//if (meta.xmlurl) {
	//	feed.feedURL = meta.xmlurl;
	//}
	feed.favicon	= meta.favicon || (meta['atom:icon'] && meta['atom:icon']['#']) || (meta.image && meta.image.url) || '';
	feed.siteURL 	= meta.link || '';
	feed.title 		= meta.title ? ut.parseHtmlEntities(meta.title).trim() : '';
	feed.description = meta.description || '';
	feed.author 	= meta.author || '';
	feed.language 	= meta.language || '';
	feed.copywrite 	= meta.copywrite || '';
	feed.categories = meta.categories || '';
	
	switch (meta.cloud.type) {
		case 'hub':      // pubsubhubbub supported
		case 'rsscloud': // rsscloud supported
	}
};

/** function StorePosts
 */
function StorePosts(stream, feed, posts, guids) {
	//console.log("StorePosts (A)");
	// data contains all the post information
	var data,
		ignoreImages = false;
	while (data = stream.read()) {
		var images = new ContainerImages(),
			videos = [];

		//console.log("StorePosts (B)");
		// Store original thumbnail url
		if (data.image !== undefined &&
			data.image.url &&
			data.image.url.length > 0) {
			images.small.push({ 'url': data.image.url });
		}

		//console.log("StorePosts (C)");
		// Used by DeviantArt
		var thumbnails = data['media:thumbnail'];
		if (!Array.isArray(thumbnails)) {
			thumbnails = [thumbnails];
		}
		for (var i in thumbnails) {
			// store thumbnail image
			if (thumbnails[i] !== undefined && thumbnails[i]['@'] !== undefined && thumbnails[i]['@'].medium !== undefined && thumbnails[i]['@'].medium !== 'document') {
				images.small.push(data['media:thumbnail']['@']);
			}
		}
		
		//console.log("StorePosts (D)");
		// Used by DeviantArt
		if (data['media:content'] !== undefined && data['media:content']['@'] !== undefined && data['media:content']['@'].medium !== undefined && data['media:content']['@'].medium !== 'document') {
			images.other.push(data['media:content']['@']);
			ignoreImages = true;
		}
		
		//console.log("StorePosts (E)");
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
					// ignoreImages OR width and height are 1 OR isn't a valid image extension
					if (ignoreImages || 
						parseInt(tag.attributes.WIDTH) <= 1 ||
						parseInt(tag.attributes.HEIGHT) <= 1 ||
						!(/\.(gif|jpg|jpeg|tiff|png)$/i).test(tag.attributes.SRC)) {
						break;
					}
					// create new image object
					var obj = {'url':tag.attributes.SRC,'width':tag.attributes.WIDTH || 0,'height':tag.attributes.HEIGHT || 0},
						found = false;
					// check if image already exists in list
					for (var i in images.other) {
						// url comparison
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
			pr.write(data.description.toString("utf8")).close();
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
		posts.push(exports.FindOrCreatePost(feed, guid, data));
	}
};

/** function PingFeed
 @param feed: the database feed object
*/
function PingFeed(feed) {
	//console.log("PingFeed - " + feed.title);
	return new rs.Promise(function(resolve, reject) {
		// pre-define variables
		var postGUIDs = [],
			posts = [],
			feedparser = new fp(),
			fp_err;
		
		feedparser
		.on('error', function(error) {	
			//console.log('FP error: ' + error)
			// always handle errors
			fp_err = error;
		})
		.on('meta', function(meta) {
			StoreMetaData(feed, meta);
		})
		// when a post is detected
		.on('readable', function () {
			StorePosts(this, feed, posts, postGUIDs);
		})
		// when the end of the feed is reached
		.on('end', function() {
			//console.log("FetchFeed (C)");
			if (fp_err) {
				//console.log("FetchFeed (N): " + fp_err);
				// if url as been flagged not to be a feed
				if (fp_err.message.match(/^Not a feed/)) {
					// remove feed from db
					resolve(feed.remove());
				} else {
					feed.lastModified = feed.failedCrawlTime = new Date();
					feed.lastFailureWasParseFailure = true;
					// save feed in db
					resolve(feed.save());
				}
			} else {
				//console.log("FetchFeed (Y) - " + feed.title);
				exports.UpdateFeed(feed, posts, resolve);
			}
		});

		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		rq.get({
			timeout:	(1000 * 3),
			url: 		decodeURIComponent(feed.feedURL), 
			headers: 	{'User-Agent':'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'}
		}, function (err, res, user) {
			// is it an invalid url?
			if ((err && err.code === 'ETIMEDOUT') || (res && res.statusCode !== 200)) {
				//console.log('Request Error: ' + feed.title + ' | ' + err + ' | ' + (res ? res.statusCode : 'N/A'))
			}
		})
		.on('error', function(err) {
			//console.log('Done - Error UpdateFeed: ' + feed.feedURL)
			feed.lastModified = feed.failedCrawlTime = new Date();
			feed.lastFailureWasParseFailure = true;
			resolve(feed.save());
		})
		.pipe(feedparser); // parse it through feedparser;
	});
}

/** function ParseFeed
 */
exports.ParseFeed = function() {
};

/** function FetchFeed
 */
exports.FetchFeed = function(feed) {
	// is feed fetching allowed?
	if (!exports.AllowFetch(feed)) {
		// return a new promise
		return true;
	}
	// return a new promise
	return PingFeed(feed);
};

/** function UpdateAllFeeds
 */
exports.UpdateAllFeeds = function(done) {
	//console.log('UpdateAllFeeds');
	// declare options object
	var opts	= {};
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
				//console.log('Update feed count: ' + a.length)
				// run all jobs
				rs
					.all(a) // execute FetchFeed promises
					/*
					.then(function() {
						// retrieve any feeds that can be removed from being cron'd
						return st.all(st.Feed,{query:{ posts: null, numSubscribers: null, lastFailureWasParseFailure: true }}).then(function(r) {
							var b = []; // declare new array
							for (var i in r) { // loop results
								b.push(r[i].remove()); // create a RemoveFeed promise
							}
							return rs.all(b); // execute RemoveFeed promises
						});
					})
					*/
					.then(function(err) {
						//console.log('Done - UpdateAllFeeds!');
						done();
					});
			} else {
				done();
			}
		});
};