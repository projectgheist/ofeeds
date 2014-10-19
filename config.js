/** Application dns location/url
 */
module.exports.Url = function() {
	if (process.env.OPENSHIFT_APP_DNS) {
		return process.env.OPENSHIFT_APP_DNS;
	}
	return 'http://localhost:' + exports.Port();
};

/** Application directory on server
 */
module.exports.Dir = function() {
	if (process.env.OPENSHIFT_REPO_DIR) {
		return process.env.OPENSHIFT_REPO_DIR;
	}
	return __dirname + '/';
};

/** Application ip address
 */
module.exports.IpAddr = function() {
	if (process.env.OPENSHIFT_NODEJS_IP) {
		return process.env.OPENSHIFT_NODEJS_IP;
	}
	return '127.0.0.1';
};

/** Application port
 */
module.exports.Port = function() {
	if (process.env.OPENSHIFT_NODEJS_PORT) {
		return process.env.OPENSHIFT_NODEJS_PORT || 8080;
	}
	return process.env.PORT || 3000;
};

/**
 */
module.exports.Google = function() {
	return {
		ClientID: '<Google application client id>',
		ClientSecret: '<Google application client secret>'
	};
};

/** Store site title
 */
module.exports.site = {
	title: "ofeeds"
};

/** Mongo DB Credentials
 */
module.exports.db = {
	hostname: process.env.OPENSHIFT_MONGODB_DB_HOST || 'localhost',
	port: process.env.OPENSHIFT_MONGODB_DB_PORT || '27017',
	dbname: process.env.OPENSHIFT_APP_NAME || 'storageDB',
	username: process.env.OPENSHIFT_MONGODB_DB_USERNAME || '',
	password: process.env.OPENSHIFT_MONGODB_DB_PASSWORD || ''
};