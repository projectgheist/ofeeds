var as = require('assert'),
	rq = require('request'),
	ap,
	cf,
	url;

/** Make sure that the utilities code compiles
 */
describe('Utilities', function() {
	it('Check compile', function (done) {
		require('../src/utils');
		done();
	});
});

/** Start the server on a specific port
 */
describe('Startup', function() {
	it('Check config file', function (done) {
		cf = require('../config');
		done();
	});
	
	it('Start server', function (done) {
		ap = require('../src/app');
		url = ['http://',cf.IpAddr(),':',cf.Port()].join('');
		done();
	});
	
	it('Start database', function (done) {
		require('../src/storage');
		done();
	});
});

/** Make sure that the routing code compiles
 */
describe('Routing', function() {
	it('Check compile', function (done) {
		require('../src/routes');
		done();
	});
});

/** Make sure that the routing code compiles
 */
describe('Feeds API', function() {
	it('Check compile', function (done) {
		require('../src/api/subscriptions');
		done();
	});

	it('Retrieve all feeds', function (done) {
		rq([url,'/api/0/feeds/list'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});
});


/** Make sure that the routing code compiles
 */
describe('Posts API', function() {
	it('Check compile', function (done) {
		require('../src/api/posts');
		done();
	});

	it('Retrieve most recent posts', function (done) {
		rq([url,'/api/0/posts'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Retrieve post BY id', function (done) {
		rq([url,'/api/0/post'].join(''), {}, function (error, response, body) {
			if (!error && response.statusCode == 400) {
				done();
			}
		});
	});
});