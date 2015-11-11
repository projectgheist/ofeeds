/** Module dependencies
 */
var Parser = require('opmlparser');

/** Import an OPML file
*/
exports.import = function (data) {
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
};
