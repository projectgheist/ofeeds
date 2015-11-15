/* global describe, it */

/** Includes
 */
var ap = require('../src/app');
var cf = require('../config');
var sr = ap.listen(cf.Port(), cf.IpAddr());
var pp = require('../src/auth');
var db = require('../src/storage');
require('../src/routes');
require('../src/api/subscriptions');
require('../src/api/streams');
require('../src/api/posts');
var rq = require('supertest').agent(sr);

/** Create mock passportjs strategy
 */
var Strategy = require('passport-local').Strategy;
pp.use(
	new Strategy(
		function (username, password, done) {
			return db
				.findOrCreate(db.User, { openID: 1, provider: 'local', name: 'test' })
				.then(function (user) {
					return done(null, user);
				});
		}
	)
);

/** Make sure that the routing code compiles
 */
describe('Routing', function () {
	it('Route - Home', function (done) {
		rq
			.get('/')
			.expect(200)
			.end(done);
	});

	it('Route - Manage', function (done) {
		rq
			.get('/manage')
			.expect(200)
			.end(done);
	});

	it('Create mock strategy', function (done) {
		ap.post('/login', function (req, res, next) {
			pp.authenticate('local', function (err, user, info) {
				if (err) { return next(err); }
				req.login(user, function (ignore) {
					if (err) { return next(err); }
					return res.redirect('/');
				});
			});
		});
		done();
	});

	it('Mock sign in', function (done) {
		rq
			.post('/login')
			.send({
				// !Required
				username: 'test',
				password: 'test'
			})
			.expect(302)
			.end(done);
	});

	it('Mock sign out', function (done) {
		rq
			.get('/logout')
			.expect(302)
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
			.expect(400)
			.end(done);
	});

	it('Search for feed (InvalidFeedUrl)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({q: 'https://www.google.com/'})
			.expect(200)
			.end(done);
	});

	it('Refresh feed (InvalidFeedUrl)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.query({q: 'https://www.google.com/'})
			.expect(200)
			.end(done);
	});

	it('Search for feed (ValidFeedUrl)', function (done) {
		rq
			.get('/api/0/subscription/search')
			.query({q: 'http://www.polygon.com/rss/index.xml'})
			.expect(200)
			.end(done);
	});

	it('Refresh feed (ValidFeedUrl)', function (done) {
		rq
			.get('/api/0/subscription/refresh')
			.query({q: 'http://www.polygon.com/rss/index.xml'})
			.expect(200)
			.end(done);
	});

	it('Route - Feed', function (done) {
		rq
			.get('/feed/http%253A%252F%252Fwww.polygon.com%252Frss%252Findex.xml')
			.expect(200)
			.end(done);
	});

	it('Load feed stream', function (done) {
		rq
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
	it('Retrieve most recent posts', function (done) {
		rq
			.get('/api/0/posts')
			.expect(200)
			.end(done);
	});

	it('Retrieve post BY id', function (done) {
		rq
			.get('/api/0/post')
			.expect(400)
			.end(done);
	});
});
