/** Includes
 */
var mg = require('mongoose');

exports.ref = function(type) {
    return {
        type: mg.Schema.Types.ObjectId,
        ref: type
    };
};

exports.GetDBConnectionURL = function(obj) {
    if (obj.username && obj.password) {
        return obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.dbname;
    }
    else{
        return obj.hostname + ":" + obj.port + "/" + obj.dbname;
    }
};