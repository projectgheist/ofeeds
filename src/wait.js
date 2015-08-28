var ut = require('./utils'),
	cf = require('../config'),
	mg = require('mongoose'),
	cr = require('./cron'),
	Agenda = require('agenda'),
	ag = new Agenda({ db: { address: ut.getDBConnectionURL(cf.db(),true), collection: 'crons' }, 
		defaultLockLifetime: 1000 * 30
	});

// purge all unreferenced jobs from db
ag.purge(function(err, numRemoved) {
	//console.log('Amount of unreferenced jobs removed: ' + numRemoved);
});

// clear all pre-existing 'UpdateAllFeeds' jobs
ag.cancel({name: 'UpdateAllFeeds'}, function(err, numRemoved) {
	//console.log("Amount of 'UpdateAllFeeds' jobs removed: " + numRemoved);
});

// set all jobs
ag.every('5 minutes','UpdateAllFeeds');

// start cron jobs
ag.start();

/** function UpdateAllFeeds
 */
ag.define('UpdateAllFeeds', { lockLifeTime: 1000 }, function(job, done) {
	// needs to have a database connection
	if (mg.connection && mg.connection.db) {
		cr.UpdateAllFeeds(done);
	} else {
		done();
	}
});

module.exports = ag;