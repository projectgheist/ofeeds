var ut = require('./utils');
var cf = require('../config');
var rs = require('rsvp');
var Agenda = require('agenda');
var ag = new Agenda({
	db: {
		address: ut.getDBConnectionURL(cf.db(), true),
		collection: 'crons'
	},
	defaultLockLifetime: 1000 * 30
});

/** function UpdateAllFeeds
 */
ag.define('UpdateAllFeeds', {
	lockLifeTime: 1000
}, function (job, done) {
	require('./cron').UpdateAllFeeds(done);
});

ag.on('ready', function () {
	// purge all unreferenced jobs from db
	ag.purge(function (ignore, count) {
	});

	// clear all pre-existing 'UpdateAllFeeds' jobs
	ag.cancel({
		name: 'UpdateAllFeeds'
	}, function (ignore, count) {
	});

	// set all jobs
	ag.every('5 minutes', 'UpdateAllFeeds');

	// start cron jobs
	ag.start();
});

/** function getAllJobs
 */
ag.getAllJobs = function () {
	return new rs.Promise(function (resolve, reject) {
		ag.jobs({
			name: 'UpdateAllFeeds'
		}, function (ignore, jobs) {
			resolve(jobs);
		});
	});
};

/** Export
 */
module.exports = ag;
