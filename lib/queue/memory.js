var _ = require('underscore');

function MemoryQueue () {
    this._database = {};
};

MemoryQueue.prototype.push = function (id, data, callback) {
    if (_.isFunction(data)) {
        callback = data;
        data = {};
    }
    var that = this;
    this.has(id, function (err) {
        if(err) {
            callback(new Error(id + " already exists in database"));
        } else {
            that._database["" + id + ""] = {id: id, data: data, isQueued: false};
            callback(null, true);
        }
    });
};

MemoryQueue.prototype.get = function(callback, count) {
    var count = (count || 1);
    var that = this;
    var filter = function (n) {
        var result = [];
        var index  = 0;
        for(var id in that._database) {
            var item = that._database[id];
            if(index >= n) break;
            if(item.isQueued === false) {
               that._database[id]['isQueued'] = true;
               result.push(item);
               index++;
            }
        }
        return result;
    };
    var next = function (err) {
       var item = filter(count);
       if(item.length <= 0 || err) {
          return;
       }
       callback(null, item, next);
    };
    next();
};

MemoryQueue.prototype.has = function(id, callback) {
    var result = _.has(this._database, id);
    if(result) {
       callback(new Error());
    } else {
       callback(null, true);
    }
};

MemoryQueue.prototype.clear = function (callback) {
    this._database = {};
    callback(null);
};

exports = module.exports = MemoryQueue;