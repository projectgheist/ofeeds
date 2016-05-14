/* global describe, it */

/** Includes
 */
var ap = require('../src/app');
var cf = require('../config');
// Include mock authentication
require('../src/strategies/local');
// Start server
var sr = ap.listen(cf.Port(), cf.IpAddr());
require('../src/routes');
// Include API
var sb = require('../src/api/subscriptions');
require('../src/api/streams');
require('../src/api/posts');
require('../src/api/tags');
var op = require('../src/api/opml');
var rq = require('supertest').agent(sr);
var rs = require('rsvp');

/** Make sure that the routing code compiles
 */
describe('Routing (Public)', function () {
	it('Started server: ' + cf.Url(), function (done) {
		done();
	});

	it('Route - View (No parameters)', function (done) {
		rq
			.get('/views/')
			.expect(200)
			.end(done);
	});

	it('Route - View (Parameters)', function (done) {
		rq
			.get('/views/pages/landing')
			.expect(200)
			.end(done);
	});

	it('Landing', function (done) {
		rq
			.get('/')
			.expect(200)
			.end(done);
	});

	it('Login', function (done) {
		rq
			.get('/login')
			.expect(302)
			.end(done);
	});

	it('Sign in (Invalid params)', function (done) {
		rq
			.post('/login')
			.expect(400)
			.end(done);
	});

	it('Logout', function (done) {
		rq
			.get('/logout')
			.expect(302)
			.end(done);
	});

	it('Post', function (done) {
		rq
			.get('/post/test')
			.expect(200)
			.end(done);
	});
});

// Test feeds to use for other tests
var feeds = [];

/** Make sure that the routing code compiles
 */
describe('OPML', function () {
	// Test feeds to use for other tests
	var opmlData;

	it('File - Import default feeds', function (done) {
		// load file from content
		op.import('./content/default_opml.xml', function (ignore, data) {
			if (data.length) {
				opmlData = data;
				done();
			}
		});
	});

	it('Add feeds to database', function (done) {
		var queries = [];
		for (var i in opmlData) {
			var encodeUrl = encodeURIComponent(opmlData[i].xmlurl);
			feeds.push(encodeUrl);
			queries.push(sb.search(encodeUrl, true));
		}
		// extend time limit as added multiple feeds to the database could take some time
		this.timeout(5000 * feeds.length);
		// execute all the queries
		rs
			.all(queries)
			.then(function (results) {
				if (results.length === feeds.length) {
					done();
				}
			});
	});
});

/** Make sure that the routing code compiles
 */
describe('Routing (No user)', function () {
	it('Management', function (done) {
		rq
			.get('/manage')
			.expect(302)
			.end(done);
	});

	it('Retrieve OPML', function (done) {
		rq
			.get('/api/0/opml')
			.expect(401)
			.end(done);
	});
});

describe('Tags API (No user)', function () {
	it('Tag post', function (done) {
		rq
			.post('/api/0/tags/edit')
			.expect(401)
			.end(done);
	});

	it('Tag rename', function (done) {
		rq
			.post('/api/0/tags/rename')
			.expect(401)
			.end(done);
	});

	it('Mark all as read', function (done) {
		rq
			.post('/api/0/tag/mark-all-as-read')
			.expect(401)
			.end(done);
	});
});

describe('Feeds API (No user)', function () {
	it('Quickadd feed', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.expect(401)
			.end(done);
	});

	it('Refresh feed', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.expect(401)
			.end(done);
	});

	it('Rename feed', function (done) {
		rq
			.post('/api/0/feed/title')
			.expect(401)
			.end(done);
	});
});

describe('Feeds API (No params)', function () {
	it('Search for feed', function (done) {
		rq
			.get('/api/0/subscription/search')
			.expect(400)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Feeds API', function () {
	it('Search feed (Invalid params)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({
				q: encodeURIComponent('google')
			})
			.expect(200)
			.end(done);
	});

	it('Search feed (Invalid params)', function (done) {
		this.timeout(5000);
		rq
			.get('/api/0/subscription/search')
			.query({
				q: encodeURIComponent('http://www.google.com/')
			})
			.expect(200)
			.end(done);
	});

	it('Search feed BY url (Valid params)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({
				q: feeds[0]
			})
			.expect(200)
			.end(function (ignore, res) {
				if (res.body.length) {
					done();
				}
			});
	});

	it('Search feed BY title (Valid params)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({
				q: encodeURIComponent('polygon')
			})
			.expect(200)
			.end(function (ignore, res) {
				if (res.body.length) {
					done();
				}
			});
	});

	it('Route feed', function (done) {
		rq
			.get('/feed/' + feeds[0])
			.expect(200)
			.end(done);
	});

	it('Fetch stream (Invalid params)', function (done) {
		rq
			.get('/api/0/stream/contents')
			.expect(400)
			.end(done);
	});

	it('Fetch stream (Valid params)', function (done) {
		rq
			.get('/api/0/stream/contents')
			.query({
				type: 'feed',
				value: feeds[0]
			})
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds', function (done) {
		rq
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds (newest)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.query({
				r: 'n'
			})
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds (oldest)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.query({
				r: 'o'
			})
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds (subscribers)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.query({
				r: 's'
			})
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds (addition)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.query({
				r: 'a'
			})
			.expect(200)
			.end(done);
	});

	it('Retrieve all feeds (unknown)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.query({
				r: 'u'
			})
			.expect(200)
			.end(done);
	});
});

// Test posts to use for other tests
var posts = [];

/** Make sure that the routing code compiles
 */
describe('Posts API', function () {
	it('Retrieve most recent posts', function (done) {
		rq
			.get('/api/0/posts')
			.expect(200)
			.end(function (ignore, res) {
				if (res.body.length) {
					posts = res.body;
					done();
				}
			});
	});

	it('Retrieve post BY id (No params)', function (done) {
		rq
			.get('/api/0/post')
			.expect(400)
			.end(done);
	});

	it('Retrieve post BY id (Invalid params)', function (done) {
		rq
			.get('/api/0/post')
			.query({
				value: 'invalid'
			})
			.expect(400)
			.end(done);
	});

	it('Retrieve post BY id (Valid params)', function (done) {
		rq
			.get('/api/0/post')
			.query({
				value: posts[0].uid
			})
			.expect(200)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Begin authentication', function () {
	it('Mock sign in', function (done) {
		rq
			.post('/login')
			.send({
				// !Required
				username: 'test',
				password: 'test'
			})
			.expect(200)
			.end(done);
	});
});

describe('Routes', function () {
	it('Dashboard', function (done) {
		rq
			.get('/dashboard')
			.expect(200)
			.end(done);
	});

	it('Management', function (done) {
		rq
			.get('/manage')
			.expect(200)
			.end(done);
	});

	it('Quickadd feed (No params)', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.expect(400)
			.end(done);
	});

	it('All feeds (No content)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Retrieve OPML (No content)', function (done) {
		rq
			.get('/api/0/opml')
			.expect(200)
			.end(done);
	});

	it('Refresh feed (No params)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.expect(400)
			.end(done);
	});

	it('Refresh feed (Invalid params)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.query({
				q: encodeURIComponent('https://www.google.com/')
			})
			.expect(200)
			.end(done);
	});

	it('Refresh feed (Valid params)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.query({
				q: feeds[0]
			})
			.expect(200)
			.end(done);
	});

	it('Quickadd feed (Invalid params)', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.send({
				q: encodeURIComponent('http://feeds.gawker.com/lifehacker/full')
			})
			.expect(200)
			.end(function (ignore, res) {
				if (!res.body.numResults) {
					done();
				}
			});
	});

	it('Quickadd feed (Valid params)', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.send({
				q: feeds[0]
			})
			.expect(200)
			.end(done);
	});

	it('Rename feed (Invalid params)', function (done) {
		rq
			.post('/api/0/feed/title')
			.expect(400)
			.end(done);
	});

	it('Rename feed (Invalid params)', function (done) {
		rq
			.post('/api/0/feed/title')
			.send({
				q: feeds[1],
				n: 'Polygon'
			})
			.expect(200)
			.end(function (ignore, res) {
				if (res.body) {
					done();
				}
			});
	});

	it('Rename feed (Valid params)', function (done) {
		rq
			.post('/api/0/feed/title')
			.send({
				q: feeds[0],
				n: 'Polygon'
			})
			.expect(200)
			.end(done);
	});

	it('All feeds (Return content)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Retrieve OPML (Return content)', function (done) {
		rq
			.get('/api/0/opml')
			.expect(200)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Stream API', function () {
	it('Fetch stream (Valid params)', function (done) {
		rq
			.get('/api/0/stream/contents')
			.query({
				type: 'feed',
				value: feeds[0],
				xt: 'InvalidTag'
			})
			.expect(400)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Tags API', function () {
	it('Tag post AS read (No params)', function (done) {
		rq
			.post('/api/0/tags/edit')
			.expect(400)
			.end(done);
	});

	it('Tag rename (No params)', function (done) {
		rq
			.post('/api/0/tags/rename')
			.expect(400)
			.end(done);
	});

	it('Tag create (No params)', function (done) {
		rq
			.get('/api/0/tags')
			.expect(400)
			.end(done);
	});

	it('Mark all as read (No params)', function (done) {
		rq
			.post('/api/0/tag/mark-all-as-read')
			.expect(400)
			.end(done);
	});

	it('Tag post AS read (Invalid params)', function (done) {
		rq
			.post('/api/0/tags/edit')
			.send({
				a: 'user/-/state/read'
			})
			.expect(400)
			.end(done);
	});

	it('Tag post AS read (Invalid params)', function (done) {
		rq
			.post('/api/0/tags/edit')
			.send({
				i: posts[0].uid
			})
			.expect(400)
			.end(done);
	});

	it('Tag rename (Invalid params)', function (done) {
		rq
			.post('/api/0/tags/rename')
			.send({
				s: ''
			})
			.expect(400)
			.end(done);
	});

	it('Tag create (Invalid params)', function (done) {
		rq
			.get('/api/0/tags')
			.query({
				s: ''
			})
			.expect(400)
			.end(done);
	});

	it('Tag create (Valid params)', function (done) {
		rq
			.get('/api/0/tags')
			.query({
				s: 'NewFolder'
			})
			.expect(200)
			.end(done);
	});

	it('Tag rename (Valid params)', function (done) {
		rq
			.post('/api/0/tags/rename')
			.send({
				s: 'NewFolder',
				dest: 'RenamedFolder'
			})
			.expect(400)
			.end(done);
	});

	it('Mark all as read (Invalid params)', function (done) {
		rq
			.post('/api/0/tag/mark-all-as-read')
			.send({
				s: ''
			})
			.expect(400)
			.end(done);
	});

	it('Tag post AS read (Valid params)', function (done) {
		rq
			.post('/api/0/tags/edit')
			.send({
				i: posts[0].uid,
				a: 'user/-/state/read'
			})
			.expect(200)
			.end(done);
	});

	it('Tag post AS unread (Valid params)', function (done) {
		rq
			.post('/api/0/tags/edit')
			.send({
				i: posts[0].uid,
				r: 'user/-/state/read'
			})
			.expect(200)
			.end(done);
	});

	it('Mark all as read (Valid params)', function (done) {
		rq
			.post('/api/0/tag/mark-all-as-read')
			.send({
				s: [feeds[0]],
				ts: ''
			})
			.expect(200)
			.end(done);
	});
});

describe('Routes WITH tags', function () {
	it('All feeds (Return content)', function (done) {
		rq
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Fetch stream (Valid params)', function (done) {
		rq
			.get('/api/0/stream/contents')
			.query({
				type: 'feed',
				value: feeds[0]
			})
			.expect(200)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('End authentication', function () {
	it('Mock sign out', function (done) {
		rq
			.get('/logout')
			.expect(302)
			.end(done);
	});
});
