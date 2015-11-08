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