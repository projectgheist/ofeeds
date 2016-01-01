/** Module dependencies
 */
// var Parser = require('opmlparser');
var Opml = require('opml-generator');
var ap = require('../app');
var db = require('../storage');
var ut = require('../utils');
var cf = require('../../config');
var mm = require('moment');

/** Import an OPML file
*/
/* exports.import = function (data) {
	var pr = new Parser(); // create parser
	var counter = 0;

	pr.on('readable', function () {
		var stream;
		var outline;
		while ((outline = stream.read()) !== undefined) {
			console.log(outline);
		}
	});

	pr.on('end', function () {
		console.log('All done. Found %s feeds.', counter);
	});
}; */

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
			return db.Feed.find({ tags: tagArray });
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
