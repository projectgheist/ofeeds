/* global describe, before, it */

/** Includes
 */
var ap = require('../src/app');
var cf = require('../config');
var sr = ap.listen(cf.Port(), cf.IpAddr());
require('../src/storage');
require('../src/auth');
require('../src/routes');
var rq = require('supertest');

/** Make sure that the routing code compiles
 */
describe('Routing', function () {
	it('Route - Home', function (done) {
		rq(sr)
			.get('/')
			.expect(200)
			.end(done);
	});

	it('Route - Manage', function (done) {
		rq(sr)
			.get('/manage')
			.expect(200)
			.end(done);
	});
/* @todo
	it('Route - Login', function (done) {
		rq([url,'/login'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done()
			}
		})
	})

	it('Route - Logout', function (done) {
		rq([url,'/logout'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done()
			}
		})
	})
*/
});

/** Make sure that the routing code compiles
 */
describe('Feeds API', function () {
	before(function (done) {
		require('../src/api/subscriptions');
		require('../src/api/streams');
		done();
	});

	it('Retrieve all feeds', function (done) {
		rq(sr)
			.get('/api/0/subscription/list')
			.expect(200)
			.end(done);
	});

	it('Search for feed (noQuery)', function (done) {
		rq(sr)
			.get('/api/0/subscription/search')
			.expect(400)
			.end(done);
	});

	it('Refresh feed (noQuery)', function (done) {
		rq(sr)
			.get('/api/0/subscription/refresh')
			.expect(400)
			.end(done);
	});

	it('Search for feed (InvalidFeedUrl)', function (done) {
		rq(sr)
			.get('/api/0/subscription/search')
			.query({q: 'https://www.google.com/'})
			.expect(200)
			.end(done);
	});

	it('Refresh feed (InvalidFeedUrl)', function (done) {
		rq(sr)
			.get('/api/0/subscription/refresh')
			.query({q: 'https://www.google.com/'})
			.expect(200)
			.end(done);
	});

	it('Search for feed (ValidFeedUrl)', function (done) {
		rq(sr)
			.get('/api/0/subscription/search')
			.query({q: 'http://www.polygon.com/rss/index.xml'})
			.expect(200)
			.end(done);
	});

	it('Refresh feed (ValidFeedUrl)', function (done) {
		rq(sr)
			.get('/api/0/subscription/refresh')
			.query({q: 'http://www.polygon.com/rss/index.xml'})
			.expect(200)
			.end(done);
	});

	it('Route - Feed', function (done) {
		rq(sr)
			.get('/feed/http%253A%252F%252Fwww.polygon.com%252Frss%252Findex.xml')
			.expect(200)
			.end(done);
	});

	it('Load feed stream', function (done) {
		rq(sr)
			.get('/api/0/stream/contents')
			.query({
				type: 'feed',
				value: 'http%253A%252F%252Fwww.polygon.com%252Frss%252Findex.xml'
			})
			.expect(200)
			.end(done);
	});
});

/** Make sure that the routing code compiles
 */
describe('Posts API', function () {
	before(function (done) {
		require('../src/api/posts');
		done();
	});

	it('Retrieve most recent posts', function (done) {
		rq(sr)
			.get('/api/0/posts')
			.expect(200)
			.end(done);
	});

	it('Retrieve post BY id', function (done) {
		rq(sr)
			.get('/api/0/post')
			.expect(400)
			.end(done);
	});
});
