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

// Indicates that Agenda still needs to be started
ag.isReady = function () {
	return false;
};

ag.on('ready', function () {
	// purge all unreferenced jobs from db
	ag.purge(function (err, count) {
		if (err) {
			throw err;
		}
	});

	// clear all pre-existing 'UpdateAllFeeds' jobs
	ag.cancel({
		name: 'UpdateAllFeeds'
	}, function (err, count) {
		if (err) {
			throw err;
		}
	});

	// set all jobs
	ag.every('5 minutes', 'UpdateAllFeeds');

	// start cron jobs
	ag.start();

	// Indicates that Agenda started correctly
	ag.isReady = function () {
		return true;
	};
});

/** function getAllJobs
 */
ag.getAllJobs = function () {
	return new rs.Promise(function (resolve, reject) {
		if (ag && ag.isReady()) {
			ag.jobs({
				name: 'UpdateAllFeeds'
			}, function (err, jobs) {
				if (err) {
					reject(err);
				} else {
					resolve(jobs);
				}
			});
		} else {
			reject();
		}
	});
};

/** Export
 */
module.exports = ag;
