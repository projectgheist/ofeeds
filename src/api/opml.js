/** Module dependencies
 */
//var Parser = require('opmlparser');
var Opml = require('opml-generator');
var ap = require('../app');
var ut = require('../utils');
var db = require('../storage');
var cf = require('../../config');
var mm = require('moment');

/** Import an OPML file
*/
/*exports.import = function (data) {
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
};*/

/** function retrieveStream
 */
ap.get('/api/0/opml', function (req, res) {
	// check if valid user
	if (!req.isAuthenticated()) {
		return res.status(401).send('Unauthorized');
	}
	db
		.all(db.Feed, {}) // retrieve all feeds
		.then(function (a) {
			if (a && a.length) {
				// create opml meta header
				var header = {
					"title": cf.site.title,
					"dateCreated": mm().toISOString()
				};
				// generate elements
				var outlines = a.map(function (e) {
					return {
						title: e.title, // @todo: use users defined title
						type: 'rss',
						xmlUrl: decodeURIComponent(e.feedURL),
						htmlUrl: e.siteURL
					};
				});
				// return results
				res.send(Opml(header, outlines));
			} else {
				return res.status(204).send('No Content');
			}
		});
});
