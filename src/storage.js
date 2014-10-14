/** Includes
 */
require('./mongoose-promise');

var mg = require('mongoose'),
    rs = require('rsvp'),
    Promise = rs.Promise,
	cf = require('../config'),
	ut = require('./utils');

/** function Connect
 * creates a connection to the MongoDB
 */
exports.connect = function(obj) {
	// if database is already connected return
    if (mg.connection.db) {
		return;
	}
    mg.connect(ut.GetDBConnectionURL(cf.db));
    var db = mg.connection;
    db.on('error', function(err) {
        console.log("MongoDB " + err);
    });
    db.once('open', function() {
        console.log('Connected to Mongo: '+obj.dbname+'!');
		/** Cron jobs execution
		 */
		require('./cron').setup();
    });
    return db;
};

exports.all = function(model) {
	return model.find({}, function(err,feeds) {
		if (err) {
			return false;
		}
		return feeds;
	});
}

exports.findOrCreate = function(model, item) {
	// upsert: bool - creates the object if it doesn't exist. Defaults to false.
    return model.findOneAndUpdate(item, {}, {upsert: true}); 
};

exports.updateOrCreate = function(model, item, update) {
    return model.findOneAndUpdate(item, update, { upsert: true });
};

/** function dropDatabase
 * Deletes the currently connected database and removes all records
 * !Should not be used for release version, used by the tests
 */
exports.dropDatabase = function(callback) {
    if (!mongoose.connection) {
		return callback(new Error('Not connected'));
    }  
    mongoose.connection.db.dropDatabase(callback);
};

/** function editTags
 * Adds and removes tags from a subscription or post
 */
exports.editTags = function(record, addTags, removeTags) {
    // optional parameter declaration
	addTags || (addTags = []);
    removeTags || (removeTags = []);
	
    var add = addTags.map(function(tag) {
        return exports.findOrCreate(exports.Tag, tag).then(function(tag) {
            record.tags.addToSet(tag);
        });
    });
    
    var remove = removeTags.map(function(tag) {
        return exports.Tag.findOne(tag).then(function(tag) {
            record.tags.remove(tag);
        });
    });
	
	// returns a promise
    return rs.all([add, remove]);
};

function getTags(tags) {
    if (tags && tags.length) {
        return exports.Tag.find({ $or: tags });
    }
	// returns an empty promise
	return new Promise(function(resolve, reject){ resolve([]); });
}

// Returns a list of posts for a list of streams (feeds and tags) as parsed
// by utils.parseStreams.
//
// Options:
//   excludeTags - items containing these tags will be excluded from the results
//   minTime - the date of the oldest item to include
//   maxTime - the date of the newest item to include
//   limit - the maximum number of items to return
//   sort - the field to sort (see mongoose docs)
exports.getPosts = function(streams, options) {
    if (!options)
        options = {};
		
    // separate streams by type
    var feeds = [], tags = [];
    streams.forEach(function(stream) {
        if (stream.type === 'feed')
            feeds.push(stream.value);
        else
            tags.push(stream.value);
    });
	
    // load the tags to include and exclude
    var includeTags, excludeTags;
    return rs.all([getTags(tags), getTags(options.excludeTags)]).then(function(results) {
        includeTags = results[0];
        excludeTags = results[1];
        		
        // find feeds given directly and by tag
        return exports.Feed.find({
            $or: [
                { feedURL: { $in: feeds }},
                { tags: { $in: includeTags, $nin: excludeTags }}
            ]
        });
    }).then(function(feeds) {
        // find posts by feed and tags, and filter by date
        var query = exports.Post.find({
            $or: [
                { feed: { $in: feeds }},
                { tags: { $in: includeTags }}
            ],
            tags: { $nin: excludeTags },
            published: {
                $gte: new Date((1000 * options.minTime) || 0),
                $lt: new Date((1000 * options.maxTime) || Date.now())
            }
        });

        if (options.limit)
            query.limit(options.limit);
            
        if (options.sort)
            query.sort(options.sort);
            
        if (options.count)
            query.count();
            
        if (options.populate)
            query.populate(options.populate);

        return query;
    });
};

// export the modules
exports.Feed 	= require('./models/feed');
exports.Post 	= require('./models/post');
exports.Tag 	= require('./models/tag');
/*
exports.User = require('./models/user');
exports.Preference = require('./models/preference');
*/