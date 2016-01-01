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
require('../src/api/subscriptions');
require('../src/api/streams');
require('../src/api/posts');
require('../src/api/opml');
var rq = require('supertest').agent(sr);

/** Make sure that the routing code compiles
 */
describe('Routing (Public)', function () {
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

/** Make sure that the routing code compiles
 */
describe('Routing (No user)', function () {
	it('Management', function (done) {
		rq
			.get('/manage')
			.expect(302)
			.end(done);
	});

	it('Quickadd feed', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.expect(401)
			.end(done);
	});

	it('Retrieve OPML', function (done) {
		rq
			.get('/api/0/opml')
			.expect(401)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Feeds API', function () {
	it('Retrieve all feeds', function (done) {
		rq
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Search for feed (noQuery)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.expect(400)
			.end(done);
	});

	it('Refresh feed (noQuery)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.expect(401)
			.end(done);
	});

	it('Search feed (Invalid params)', function (done) {
		this.timeout(5000);
		rq
			.get('/api/0/subscription/search')
			.query({q: 'https://www.google.com/'})
			.expect(200)
			.end(done);
	});

	it('Search feed (Valid params)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({
				q: encodeURIComponent('http://www.polygon.com/rss/index.xml')
			})
			.expect(200)
			.end(function (ignore, res) {
				if (res.body.length) {
					done();
				}
			});
	});

	it('Route - Feed', function (done) {
		rq
			.get('/feed/' + encodeURIComponent('http://www.polygon.com/rss/index.xml'))
			.expect(200)
			.end(done);
	});

	it('Load feed stream', function (done) {
		rq
			.get('/api/0/stream/contents')
			.query({
				type: 'feed',
				value: encodeURIComponent('http://www.polygon.com/rss/index.xml')
			})
			.expect(200)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Posts API', function () {
	it('Retrieve most recent posts', function (done) {
		rq
			.get('/api/0/posts')
			.expect(200)
			.end(done);
	});

	it('Retrieve post BY id (No params)', function (done) {
		rq
			.get('/api/0/post')
			.expect(400)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Routing (Authenticated)', function () {
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
				q: encodeURIComponent('http://www.polygon.com/rss/index.xml')
			})
			.expect(200)
			.end(done);
	});

	it('Quickadd feed (Valid params)', function (done) {
		rq
			.post('/api/0/subscription/quickadd')
			.send({
				q: encodeURIComponent('http://www.polygon.com/rss/index.xml')
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

	it('Mock sign out', function (done) {
		rq
			.get('/logout')
			.expect(302)
			.end(done);
	});
});
