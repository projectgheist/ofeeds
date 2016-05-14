/** Module dependencies
 */
// var Parser = require('opmlparser');
var Opml = require('opml-generator');
var ap = require('../app');
var db = require('../storage');
var ut = require('../utils');
var cf = require('../../config');
var mm = require('moment');
var fs = require('fs');
var Parser = require('opmlparser');

/** Import an OPML file
*/
exports.import = function (fileName, done) {
	var stream = fs.createReadStream(fileName);
	// create parser
	var pr = new Parser();
	// count of feeds included in the data
	var counter = 0;
	// return data
	var data = [];

	stream.on('open', function () {
		var self = this;
		self.pipe(pr);
	});

	pr.on('readable', function () {
		var self = this;
		var outline;
		while ((outline = self.read()) !== null) {
			// add data to output array
			data.push(outline);
			// increment counter
			++counter;
		}
	});

	pr.on('error', function (ignore) {
		// always handle errors
		done(ignore, null);
	});

	pr.on('end', function () {
		done(null, data);
	});
};

/** function retrieveStream
 */
ap.get('/api/0/opml', function (req, res) {
	// check if valid user
	if (!req.isAuthenticated()) {
		return res.status(401).end();
	}
	// Find tag that indicates the users reading-list
	db
		.getTags(ut.parseTags('user/-/state/reading-list', req.user))
		.then(function (tagArray) {
			return db.Feed.find({
				tags: tagArray
			});
		})
		.then(function (a) {
			// create opml meta header
			var header = {
				title: cf.site.title,
				dateCreated: mm().toISOString()
			};
			// generate elements
			var outlines = a.map(function (e) {
				return {
					title: e.title, // @todo: use users defined title
					type: 'rss',
					xmlUrl: decodeURIComponent(e.feedURL),
					htmlUrl: e.siteURL,
					text: e.description
				};
			});
			// return results
			res.send(Opml(header, outlines));
		});
});
