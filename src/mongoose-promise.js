var mg = require('mongoose');

// wrap mongoose methods so they return promises
mg.Query.prototype.then = function(done, fail) {
    return this.exec().then(done, fail);
};

function wrap(obj, method) {
    var old = obj[method];
    obj[method] = function() {
        if (arguments.length && typeof arguments[arguments.length - 1] === 'function')
            return old.apply(this, arguments);
            
        var promise = new mg.Promise;
        var args = Array.prototype.slice.call(arguments);
        
        args.push(function(err, result) {
            promise.resolve(err, result);
        });
        
        old.apply(this, args);
        return promise;
    };
}

wrap(mg.Model.prototype, 'populate');
wrap(mg.Model, 'create');
wrap(mg.Model, 'populate');
wrap(mg.Model.prototype, 'save');
wrap(mg.Model.prototype, 'remove');

// mongoose's pre/post hooks overwrite the save and remove functions
// so we have to wrap those again to return promises
function hook(method) {
	var fn = mg.Document.prototype[method];
	mg.Document.prototype[method] = function(name) {
        var ret = fn.apply(this, arguments);
        var old = this[name];
        wrap(this, name);
        this[name].numAsyncPres = old.numAsyncPres;
        return ret;
	};
}

hook('pre');
hook('post');