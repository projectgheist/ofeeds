/** Includes
 */
var mg = require('mongoose'),
	vd = require('validator');

exports.fullURL = function(req) {
    return req.protocol + '://' + req.headers.host + req.url;
};

exports.ref = function(type) {
    return {
        type: mg.Schema.Types.ObjectId,
        ref: type
    };
};

exports.isUrl = function(url) {
    return vd.isURL(url);
};

exports.GetDBConnectionURL = function(obj,noPrefix) {
	var r = '';
	if (process.env.OPENSHIFT_MONGODB_DB_URL) {
		r = process.env.OPENSHIFT_MONGODB_DB_URL + obj.dbname;
    } else if (obj.username && obj.password) {
        r = "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.dbname;
    } else {
        r = "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.dbname;
    }
	if (r) {
		r = r.substring(10,r.length);
	}
	return r;
};

exports.parseParameters = function(obj,user) {
	// if empty variable, return
	if (!obj)
        return false;

	if (typeof obj === "object") {
		for (var i in obj) {
			if (!exports.isUrl(obj[i])) {
				continue;
			}
			return [{ type: 'feed', value: obj[i] }];
		}
	}
	
	// remove '/' from start of string
	if (typeof obj === "string" && obj.match('^\/')) {
		obj = obj.substring(1,obj.length);
	}
	
	// check if already an array, else make it an array
    if (!Array.isArray(obj)) {
        obj = [obj];
	}
		
    for (var i = 0; i < obj.length; i++) {
        var urls = exports.parseFeeds(obj[i]);
        if (urls) {
            obj[i] = {
                type: 'feed',
                value: urls[0]
            };
        } else {
            var tags = exports.parseTags(obj[i], user);
            if (!tags)
                return null;
			
            obj[i] = {
                type: 'tag',
                value: tags[0]
            }
        }
    }
    return obj;
};

exports.parseFeeds = function(feeds) {
    if (!feeds)
        return null;
        
    if (!Array.isArray(feeds))
        feeds = [feeds];
        
    for (var i = 0; i < feeds.length; i++) {
        if (!/^feed\//.test(feeds[i]))
            return null;
            
        var url = feeds[i].slice(5);
        if (!exports.isUrl(url))
            return null;
            
        feeds[i] = url;
    }
    return feeds;
};

exports.parseTags = function(tags, user) {
    if (!tags)
        return null;
        
    if (!Array.isArray(tags))
        tags = [tags];
        
    for (var i = 0; i < tags.length; i++) {
        var match = /^user\/(.+)\/(state|label)\/(.+)$/.exec(tags[i]);
        
        // allow user/<userId>/state/foo and also user/-/state/foo
        if (!match || (/* @todo: re-enable: match[1] !== user.id && */match[1] !== '-'))
            return null;
            
        tags[i] = {
            user: user,
            type: match[2],
            name: match[3]
        };
    }
    
    return tags;
};