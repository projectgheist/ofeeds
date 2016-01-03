/** Includes
 */
var mg = require('mongoose');
var vd = require('validator');

/** function isEmpty
*/
exports.isEmpty = function (obj) {
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
};

/** function startsWith
 * Checks if a string starts with a certain char/string
 * @param val: char or string to search for in the input string
 * @param str: input string/array of strings
 * @param out: string value that starts with the defined val
*/
exports.startsWith = function (val, str, out) {
	// loop array of strings
	for (var i in str) {
		if (val.indexOf(str[i].toLowerCase()) === 0) {
			out = str[i];
			return true;
		}
	}
	return false;
};

/** function stringInsert
@param o: original string
@param i: string to insert
@param p: insert position
*/
exports.stringInsert = function (o, i, p) {
	return [o.slice(0, p), i, o.slice(p)].join('');
};

/** function stringReplace
*/
exports.stringReplace = function (val, str) {
	var re;
	for (var i in str) {
		re = new RegExp('(' + str[i] + ')(?:.*?)', 'i');
		val = val.replace(re, parseInt(i, 0) + 1);
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

// converts an array to an object by returning its first element
exports.arrayToObject = function (val) {
	return exports.isArray(val) ? val[0] : val;
};

// returns a string that points to the database url
exports.getDBConnectionURL = function (obj, noPrefix) {
	var r = process.env.OPENSHIFT_MONGODB_DB_URL ? [process.env.OPENSHIFT_MONGODB_DB_URL, obj.dbname].join('') : obj.url;
	if (!r) {
		r = (obj.username && obj.password) ? [obj.username, ':', obj.password, '@'].join('') : '';
		r = [r, obj.hostname, ':', obj.port, '/', obj.dbname].join('');
	}
	// removes 'mongodb://' from string
	r = r.replace(/mongodb:\/\//gi, '');
	return r;
};

/** function parseHtmlEntities
*/
exports.parseHtmlEntities = function (str) {
	// early out
	if (!str || !str.length) {
		return '';
	}
	return str
		.replace(/&#([0-9]{1,3});/gi, function (match, numStr) {
			var num = parseInt(numStr, 10);// read num as normal number
			return String.fromCharCode(num);
		})
		.trim();
};

exports.parseItems = function (items) {
	if (!items) {
		return null;
	}
	if (!exports.isArray(items)) {
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
	// if empty variable, early out
	if (!tags) {
		return null;
	}
	// check if already an array, else make it an array
	if (!exports.isArray(tags)) {
		tags = [tags];
	}
	// loop all tags
	for (var i = 0; i < tags.length; i++) {
		// match 'user/<userId>/state/foo' AND 'user/-/state/foo'
		var match = /^user\/(.+)\/(state|label)\/(.+)$/.exec(tags[i]);
		// no regex matches found OR mismatched user ID
		if (!match || (match[1] !== '-' && match[1] !== user._id)) {
			continue;
		}
		tags[i] = {
			'user': user._id, // reference to user db object
			type: match[2],	// string: state or label
			name: match[3] // string: url
		};
	}
	return tags;
};
