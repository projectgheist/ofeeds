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

	it('Enable authentication', function (done) {
		require('../src/auth');
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

	it('Route - Home', function (done) {
		rq(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Route - Login', function (done) {
		rq([url,'/login'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Route - Logout', function (done) {
		rq([url,'/logout'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
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
		rq([url,'/api/0/subscription/list'].join(''), function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});
	
	it('Search for feed (noFeedUrl)', function (done) {
		rq.get({url: [url,'/api/0/subscription/search'].join(''), qs: {q:'noFeedUrl'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Refresh feed (noFeedUrl)', function (done) {
		rq.get({url: [url,'/api/0/subscription/refresh'].join(''), qs: {q:'noFeedUrl'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Search for feed (InvalidFeedUrl)', function (done) {
		this.timeout(5000);
		rq.get({url: [url,'/api/0/subscription/search'].join(''), qs: {q:'https://www.google.com/'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Refresh feed (InvalidFeedUrl)', function (done) {
		this.timeout(5000);
		rq.get({url: [url,'/api/0/subscription/refresh'].join(''), qs: {q:'https://www.google.com/'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Search for feed (ValidFeedUrl)', function (done) {
		this.timeout(5000);
		rq.get({url: [url,'/api/0/subscription/search'].join(''), qs: {q:'http://www.polygon.com/rss/index.xml'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Refresh feed (ValidFeedUrl)', function (done) {
		this.timeout(5000);
		rq.get({url: [url,'/api/0/subscription/refresh'].join(''), qs: {q:'http://www.polygon.com/rss/index.xml'}}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				done();
			}
		});
	});

	it('Route - Feed', function (done) {
		this.timeout(5000);
		rq.get([url,'/feed/http%253A%252F%252Fwww.polygon.com%252Frss%252Findex.xml'].join(''), function (error, response, body) {
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