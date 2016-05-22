/** Includes
 */
var mg = require('mongoose');
var vd = require('validator');

/** function isEmpty
 * Checks to see if an object has any variables/functions
 * @returns true if nothing is detected, else false
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
 * @param o: original string
 * @param i: string to insert
 * @param p: insert position
*/
exports.stringInsert = function (o, i, p) {
	return [o.slice(0, p), i, o.slice(p)].join('');
};

exports.fullURL = function (req) {
	return [req.protocol, '://', req.headers.host, req.url].join('');
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

// checks if value is an array
exports.isArray = function (val) {
	return Array.isArray(val);
};

// converts an array to an object by returning its first element
exports.arrayToObject = function (val, offset) {
	return exports.isArray(val) ? (val.length ? val[(offset || 0)] : false) : val;
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
	var result = '';
	// early out
	if (str && str.length) {
		result = str
			.replace(/&#([0-9]{1,3});/gi, function (match, numStr) { return String.fromCharCode(parseInt(numStr, 10)); })
			.replace(/\n/g, ' ')
			.trim();
	}
	return result;
};

/** function parseTags
*/
exports.parseTags = function (tags, user) {
	// make array
	var arr = exports.createArray(tags);
	// if empty variable, early out
	if (!arr.length) {
		return [];
	}
	// declare return object
	var results = [];
	// loop all tags
	for (var i = 0; i < arr.length; i++) {
		// match 'user/<userId>/state/foo' AND 'user/-/state/foo'
		var match = /^user\/(.+)\/(state|label)\/(.+)$/.exec(arr[i]);
		// no regex matches found OR mismatched user ID
		if (!match || (match[1] !== '-' && match[1] !== user._id)) {
			continue;
		}
		results.push({
			'user': user._id, // reference to user db object
			type: match[2],	// string: state or label
			name: match[3] // string: url
		});
	}
	// return results
	return results;
};

/** function createArray
*/
exports.createArray = function (obj) {
	// if empty variable, early out
	if (!obj) {
		return [];
	}
	// check if already an array, else make it an array
	if (!exports.isArray(obj)) {
		obj = [obj];
	}
	// return results
	return obj;
};
