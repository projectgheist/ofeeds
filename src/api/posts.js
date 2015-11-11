var ap = require('../app');
var db = require('../storage');
var ut = require('../utils');

/** function retrieveAllPosts
 */
ap.get('/api/0/posts', function (req, res) {
	// make options variable
	var opts = {
		sort: { published: (!req.query.r || req.query.r !== 'o') ? -1 : 1 }, // newest first
		limit: req.query.n || 5 // limit the amount of output feeds
	};

	db
		.all(db.Post, opts) // retrieve all feeds
		.populate('feed') // replacing the specified paths in the document with document(s) from other collection(s)
		.then(function (posts) {
			var fp = db.formatPosts({}, posts);// formatted posts
			return res.json(fp);
		});
});

/** function retrievePost
 */
ap.get('/api/0/post*', function (req, res) {
	// has parameters?
	var q = req.query;
	if (!q || !q.value) {
		return res.status(400).send('InvalidParams');
	} else {
		// create query
		db.Post
			.find({
				shortid: q.value
			})
			.populate('feed') // replacing the specified paths in the document with document(s) from other collection(s)
			.then(function (post) {
				var fp = db.formatPosts({}, post);// formatted posts
				return res.status(200).json(fp.length && ut.isArray(fp) ? fp[0] : {});
			});
	}
});
