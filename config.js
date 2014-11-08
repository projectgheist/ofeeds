/** Application dns location/url
 */
module.exports.Url = function() {
	if (process.env.OPENSHIFT_APP_DNS) {
        // Openshift
        return 'http://' + process.env.OPENSHIFT_APP_DNS;
	} else if (process.env.AF_APP_URL) {
        // Appfog
		return process.env.AF_APP_URL;
	}
	return 'http://localhost:' + exports.Port();
};

/** Application directory on server
 */
module.exports.Dir = function() {
	if (process.env.OPENSHIFT_REPO_DIR) {
        // Openshift
        return process.env.OPENSHIFT_REPO_DIR;
	}
	return __dirname + '/';
};

/** Application ip address
 */
module.exports.IpAddr = function() {
	if (process.env.OPENSHIFT_NODEJS_IP) {
        // Openshift
		return process.env.OPENSHIFT_NODEJS_IP;
	}
	return '127.0.0.1';
};

/** Application port
 */
module.exports.Port = function() {
	if (process.env.OPENSHIFT_NODEJS_PORT) {
        // Openshift
		return process.env.OPENSHIFT_NODEJS_PORT;
	} else if (process.env.VCAP_APP_PORT) {
        // Appfog
		return process.env.VCAP_APP_PORT;
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
module.exports.db = function() {
	// default database name
	var defaultDbName = 'storageDB';
    // Appfog
	if (process.env.VCAP_SERVICES) {
		var env = JSON.parse(process.env.VCAP_SERVICES);
        // support multiple mongodb configurations
        if (env['mongodb-1.8']) {
            return env['mongodb-1.8'][0]['credentials']; 
        } else if (env['mongodb2-2.4.8']) {
            return env['mongodb2-2.4.8'][0]['credentials'];
        }
	} else {
		return {
			hostname: 	process.env.OPENSHIFT_MONGODB_DB_HOST || 'localhost',
			port: 		process.env.OPENSHIFT_MONGODB_DB_PORT || '27017',
			dbname: 	process.env.OPENSHIFT_APP_NAME || defaultDbName,
			username: 	process.env.OPENSHIFT_MONGODB_DB_USERNAME || '',
			password: 	process.env.OPENSHIFT_MONGODB_DB_PASSWORD || ''
		};
	}
};