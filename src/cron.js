/** Includes
 */
var rq = require('request');
var rs = require('rsvp');
var pr = require('sax').parser(false);
var db = require('./storage');
var mm = require('moment');
var ut = require('./utils');

/** Declare a class */
var FeedParser = require('feedparser');

/** function FindOrCreatePost
 */
exports.FindOrCreatePost = function (feed, guid, data) {
	// return a new promise
	return new rs.Promise(function (resolve, reject) {
		var m = data['media:group'];
		var d = data.description ? data.description : ((m && m['media:description'] && m['media:description']['#']) ? m['media:description']['#'] : '');
		db
			.updateOrCreate(db.Post, {
				'feed': feed,
				'url': guid
			}, {
				title: (data.title ? ut.parseHtmlEntities(data.title) : 'No title'),
				body: CleanupDescription(d || '', data.images),
				summary: CleanupSummary(d),
				images: data.images,
				videos: data.videos,
				// prevent the publish date to be overridden
				published: SelectPublishedDate(data),
				// time the post has been last modified
				updated: mm(),
				author: (data.author ? data.author.trim() : ''),
				commentsURL: data.comments || '',
				categories: data.categories || undefined
			})
			.then(function (post) {
				// if feeds post variable doesn't exist, make it an array
				feed.posts || (feed.posts = []);
				// add post to posts array
				feed.posts.addToSet(post);
				// return succesfully
				resolve();
			});
	});
};

/** function SelectPublishedDate
 */
function SelectPublishedDate (data, debug) {
	var result = mm();
	if (data['rss:pubdate'] && data['rss:pubdate']['#']) {
		result = mm(new Date(data['rss:pubdate']['#']).toISOString());
	} else if (data.pubdate) {
		result = mm(new Date(data.pubdate).toISOString());
	} else if (data.meta && data.meta.pubdate) {
		result = mm(new Date(data.meta.pubdate).toISOString());
	}
	return result;
}

/** function CleanupSummary
 */
function CleanupSummary (data, debug) {
	// early escape on no string
	if (!data || data.length <= 0) {
		return '';
	}
	//  remove all html tags and return
	return data
		.replace(/<br[\s\S]*?>/gi, ' ')
		.replace(/<.*?>/gi, '')
		.trim();
}

/** function CleanupDescription
 */
function CleanupDescription (data, images, debug) {
	// early escape on no string
	if (data && data.length) {
		data = data
			.replace(/<\/img>|<hr>|<\/*h\d>/gi, '') // remove headings OR separator
			.replace(/<br[\s\S]*?>/gi, ' ') // remove new lines
			.replace(/(<script)[\s\S]*?(<\/script>)/gi, '') // remove scripts
			.replace(/(<iframe)[\s\S]*?(\/iframe>)/gi, ''); // remove iframes

		// p: needs to be a separate variable otherwise it will be an infinite loop
		var p, e;
		var i = [];// array of image urls to remove

		// remove thumbnails
		if (images) {
			if (images.small.length) {
				i = i.concat(images.small);
			}
			if (images.other.length) {
				i.push(images.other[0]);
			}
			if (i.length) {
				p = /<img\s.*?src="(.*?)"[\s\S][^>]*>/gi;
				while ((e = p.exec(data)) !== null) {
					for (var j in i) { // loop all urls
						if (e[1] === i[j].url) { // compare image src urls
							data = data.replace(e[0], ''); // do string replace
						}
					}
				}
			}
		}

		data = data
			.replace(/(<img\s)(.*?)((height|width)="1"\s*)+(.*?>)/gi, '') // remove ad images
			.replace(/<a\s?.*?>[\s\n]*<\/a>/gi, ''); // remove empty links

		// add new tab to all links
		p = /<a\s/gi;
		while ((e = p.exec(data)) !== null) {
			data = ut.stringInsert(data, 'target="_blank"', e.index + 3);
		}

		// trim empty space
		data = data.trim();
	}
	// return values
	return data;
}

/** function UpdateFeed
 */
exports.UpdateFeed = function (feed, posts, debug) {
	// wait for posts to finish saving then mark crawl success or failure
	return rs
		.all(posts)
		.then(function () {
			// set new successful crawl date
			feed.successfulCrawlTime = new Date();
			// set new modified date
			feed.lastModified = mm();
			// save feed in db and return
			return feed.save();
		}, function (ignore) {
		});
};

/** function AllowFetch
	 if feed is valid AND if it was updated more then 2 minutes ago
 */
exports.AllowFetch = function (feed) {
	return feed && (!feed.successfulCrawlTime || (feed.successfulCrawlTime && mm().diff(feed.successfulCrawlTime, 'minutes') > 2));
};

/** function StoreMetaData
 */
function StoreMetaData (feed, meta) {
	/* !don't over write the feedUrl with the meta.xmlurl as we created already with the unique feedURL,
		otherwise we found need to do some feed merging */
	// if (meta.xmlurl) {
	//	feed.feedURL = meta.xmlurl;
	// }
	feed.favicon = meta.favicon || (meta['atom:icon'] && meta['atom:icon']['#']) || (meta.image && meta.image.url) || '';
	feed.siteURL = meta.link || '';
	feed.title = meta.title ? ut.parseHtmlEntities(meta.title).trim() : '';
	feed.description = CleanupSummary(meta.description) || '';
	feed.author = meta.author || '';
	feed.language = meta.language || '';
	feed.copywrite = meta.copywrite || '';
	feed.categories = meta.categories || '';
}

/** function StorePosts
 */
function StorePosts (stream, feed, posts, guids) {
	// data contains all the post information
	var data;
	var ignoreImages = false;
	while ((data = stream.read()) !== null) {
		// declare variables
		var images = {
			small: [],
			other: []
		};
		var videos = [];

		// Store original thumbnail url
		if (data.image !== undefined &&
			data.image.url &&
			data.image.url.length > 0) {
			images.small.push({ 'url': data.image.url });
		}

		// Used by DeviantArt
		var thumbnails = ut.createArray(data['media:thumbnail'] || (data['media:group'] ? data['media:group']['media:thumbnail'] : undefined));
		// loop all found thumbnails
		for (var i in thumbnails) {
			if (thumbnails[i] && thumbnails[i]['@'] && (thumbnails[i]['@'].medium === undefined || thumbnails[i]['@'].medium !== 'document')) {
				images.small.push(thumbnails[i]['@']); // store thumbnail image
			}
		}

		// Used by DeviantArt, Youtube, Imgur
		var m = data['media:content'] || (data['media:group'] ? data['media:group']['media:content'] : undefined);
		if (m && m['@']) {
			if (m['@'].medium && m['@'].medium === 'image') {
				images.other.push(m['@']);
				ignoreImages = true;
			} else if (m['@'].type && m['@'].type === 'application/x-shockwave-flash') {
				videos.push(m['@'].url);
			}
		}

		// Retrieve all the images from the post description
		if (data.description !== null) {
			pr.onopentag = function (tag) {
				// NOTE: tag names and attributes are all in CAPS
				switch (tag.name) {
				case 'IMG':
					// ignoreImages OR if either width OR height are 1
					if (ignoreImages ||
						parseInt(tag.attributes.WIDTH, 10) <= 1 ||
						parseInt(tag.attributes.HEIGHT, 10) <= 1) {
						break;
					}
					// has valid image extension
					var m = tag.attributes.SRC.match(/http.*\.(gif|jpg|jpeg|tiff|png)/i);
					// create new image object
					var obj = {
						url: m[0], // returns the first match, second match is the extension
						width: parseInt(tag.attributes.WIDTH, 10) || 0,
						height: parseInt(tag.attributes.HEIGHT, 10) || 0
					};
					var found = false;
					// check if image already exists in list
					for (var i in images.other) {
						// url comparison
						if (images.other[i].url === obj.url) {
							found = true;
							break; // stop for-loop
						}
					}
					// image has not been added already?
					if (!found) {
						// add to images array
						images.other.push(obj);
					}
					break;
				case 'VIDEO':
					images.other.push({
						url: tag.attributes.POSTER,
						width: parseInt(tag.attributes.WIDTH, 10) || 0,
						height: parseInt(tag.attributes.HEIGHT, 10) || 0
					});
					break;
				case 'IFRAME':
					// add video url to array
					videos.push(tag.attributes.SRC);
					break;
				}
			};
			// Parse the post description for image/video tags
			pr.write(data.description.toString('utf8')).close();
		}
		// default image container
		data.images = images;
		// store videos in object
		data.videos = videos;
		// find post unique identifier
		var guid = data.link || (data['atom:link'] ? data['atom:link']['@'].href : '');
		// store data as ref
		posts.push(exports.FindOrCreatePost(feed, guid, data));
	}
}

/** function PingFeed
 @param feed: the database feed object
*/
function PingFeed (feed, debug) {
	return new rs.Promise(function (resolve, reject) {
		// pre-define variables
		var posts = [];
		var fp = new FeedParser();
		var fp_err;

		fp
			.on('error', function (error) {
				// always handle errors
				fp_err = error;
			})
			.on('meta', function (meta) {
				StoreMetaData(feed, meta);
			})
			// when a post is detected
			.on('readable', function () {
				StorePosts(this, feed, posts);
			})
			// when the end of the feed is reached
			.on('end', function () {
				// if url as been flagged not to be a feed
				if (fp_err && fp_err.message.match(/^Not a feed/)) {
					// remove feed from db
					resolve(feed.remove());
				} else {
					resolve(exports.UpdateFeed(feed, posts, debug));
				}
			});

		// !NOTE: Fake set header as some websites will give 'Forbidden 403' errors, if not set
		rq
			.get({
				timeout: 3000,
				url: decodeURIComponent(feed.feedURL),
				headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36'}
			}, function (err, res, user) {
				// is it an invalid url?
				if ((err && err.code === 'ETIMEDOUT') || (res && res.statusCode !== 200)) {
					// console.log('Request Error: ' + feed.title + ' | ' + err + ' | ' + (res ? res.statusCode : 'N/A'))
				}
			})
			.on('error', function (ignore) {
				feed.lastModified = feed.failedCrawlTime = new Date();
				feed.lastFailureWasParseFailure = true;
				resolve(feed.save());
			})
			.pipe(fp); // parse it through feedparser;
	});
}

/** function FetchFeed
 */
exports.FetchFeed = function (feed, debug) {
	// is feed fetching allowed?
	return exports.AllowFetch(feed) ? PingFeed(feed, debug) : feed;
};

/** function UpdateAllFeeds
 */
exports.UpdateAllFeeds = function (done) {
	// retrieve all feeds
	db
		.all(db.Feed, {
			// oldest feeds first
			sort: {lastModified: 1},
			// limit the amount of feeds
			limit: 15
		})
		.populate('posts') // replacing the specified paths in the document with document(s) from other collection(s)
		.then(function (feeds) {
			// execute FetchFeed promises
			return rs.all(feeds.map(function (val) {
				return exports.FetchFeed(val);
			}));
		})
		.then(function () {
			done();
		});
};
