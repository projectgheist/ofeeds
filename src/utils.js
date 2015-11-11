/** Includes
 */
var mg = require('mongoose'),
var vd = require('validator');

/** function startsWith
 * Checks if a string starts with a certain char/string
 * @param val: char or string to search for in the input string
 * @param str: input string/array of strings
 * @param out: string value that starts with the defined val
*/
exports.startsWith = function (val, str, out) {
	// check if already an array, else make it an array
	if (!Array.isArray(str)) {
		str = [str];
	}
	// loop array of strings
	for (var i in str) {
		if (val.indexOf(str[i].toLowerCase()) === 0) {
			out = str[i];
			return true;
		}
	}
	return false;
};

/**
@param o: original string
@param i: string to insert
@param p: insert position
*/
exports.stringInsert = function (o, i, p) {
	return [o.slice(0, p), i, o.slice(p)].join('');
};

exports.stringReplace = function (val, str) {
	// check if already an array, else make it an array
	if (!Array.isArray(str)) {
		str = [str];
	}
	var re;
	for (var i in str) {
		re = new RegExp('(' + str[i] + ')(?:.*?)', 'i');
		val = val.replace(re, parseInt(i) + 1);
	}
	return val;
};

exports.clamp = function (val, min, max) {
	return Math.min(Math.max(val, min), max);
};

exports.fullURL = function (req) {
	return req.protocol + '://' + req.headers.host + req.url;
};

exports.ref = function (type) {
	return {
		type: mg.Schema.Types.ObjectId,
		ref: type
	};
};

exports.refAndIndex = function (type) {
	return {
		type: mg.Schema.Types.ObjectId,
		ref: type,
		index: 1
	};
};

// check if the string is a url
exports.isUrl = function (url) {
	return vd.isURL(url);
};

// check if the string is a url
exports.isRead = function (user, tag) {
	if (!user || Object.keys(user).length === 0) {
		return false;
	}
	var match = /^user\/(.+)\/(state|label)\/(.+)$/.exec(tag);
	if (match && match[1] === user._id && match[3] === 'read') {
		return true;
	}
	return false;
};

// checks if value is an array
exports.isArray = function (val) {
	return Array.isArray(val);
};

// returns a string that points to the database url
exports.getDBConnectionURL = function (obj, noPrefix) {
	var r = '';
	if (process.env.OPENSHIFT_MONGODB_DB_URL) {
		r = process.env.OPENSHIFT_MONGODB_DB_URL + obj.dbname;
	} else if (obj.url) {
		r = obj.url;
	} else if (obj.username && obj.password) {
		r = 'mongodb://' + obj.username + ':' + obj.password + '@' + obj.hostname + ':' + obj.port + '/' + obj.dbname;
	} else {
		r = 'mongodb://' + obj.hostname + ':' + obj.port + '/' + obj.dbname;
	}
	if (r) {
		r = r.substring(10, r.length);
	}
	return r;
};

exports.parseParameters = function (obj, user) {
	// if empty variable, return
	if (!obj) {
		return false;
	}

	// remove '/' from start of string
	if (typeof obj === 'string' && obj.match('^\/')) {
		obj = obj.substring(1, obj.length);
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
			value: urls[0]};
		} else {
			var tags = exports.parseTags(obj[i], user);
			if (!tags)
				return null;

			obj[i] = {
				type: 'tag',
			value: tags[0]};
		}
	}
	return obj;
};

/**
*/
exports.parseHtmlEntities = function (str) {
	if (!str) {
		return '';
	}
	return str
		.replace(/&#([0-9]{1,3});/gi, function (match, numStr) {
			var num = parseInt(numStr, 10);// read num as normal number
			return String.fromCharCode(num);
		})
		.trim();
};

/**
*/
exports.parseFeeds = function (feeds) {
	if (!feeds) {
		return null;
	}
	if (!Array.isArray(feeds)) {
		feeds = [feeds];
	}
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

exports.parseItems = function (items) {
	if (!items) {
		return null;
	}
	if (!Array.isArray(items)) {
		items = [items];
	}
	for (var i = 0; i < items.length; i++) {
		// the long version has a prefix and the id in hex
		var match = /^tag:reader\/item\/([0-9a-f]+)$/.exec(items[i]);
		if (!match) {
			return null;
		}
		// store post mongoDB ID
		items[i] = match[1];
	}
	return items;
};

exports.parseTags = function (tags, user) {
	// if empty variable, return
	if (!tags) {
		return null;
	}
	// check if already an array, else make it an array
	if (!Array.isArray(tags)) {
		tags = [tags];
	}
	for (var i = 0; i < tags.length; i++) {
		// match 'user/<userId>/state/foo' and also 'user/-/state/foo'
		var match = /^user\/(.+)\/(state|label)\/(.+)$/.exec(tags[i]);
		if (!match || (match[1] !== user.id && match[1] !== '-')) {
			return null;
		}
		tags[i] = {
			'user': user._id, // reference to user db object
			type: match[2],	// string: state or label
			name: match[3],	// string: url 
		};
	}
	return tags;
};
