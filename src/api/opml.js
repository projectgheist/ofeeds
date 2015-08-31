/** Module dependencies
 */
var ex = require('express'),
	ap = module.exports = ex(),
	rs = require('rsvp'),
	op = require('opmlparser');

/** Import an OPML file
*/
exports.import = function(data) {
	var pr = new op(); // create parser
	var counter = 0;
	
	pr.on('readable', function() {
		while (outline = stream.read()) {
			console.log(outline);
		}
	});
	
	pr.on('error', function(error) {
	});
	
	pr.on('end', function () {
		console.log('All done. Found %s feeds.', counter);
	});
	
	//file.pipe
};

exports.export = function() {
	return ;
};