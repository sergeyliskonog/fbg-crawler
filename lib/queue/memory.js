var _ = require('underscore');

function MemoryQueue () {
    this._visited = [];
    this._stack   = [];
    this._index   = 0;
};

MemoryQueue.prototype.push = function (id, data, callback) {
    if (_.isFunction(data)) {
        callback = data;
        data = {};
    }

    this._stack.push({id:id, data:data});
    this._index++;

    callback(null, true);
};

MemoryQueue.prototype.pop = function (callback, count) {
    count = (count || 1);
    var item = this._stack.splice(-count),
        that = this;

    item.map(function (i) {
        that._visited.push(i);
    });

    callback(null, item);
};

MemoryQueue.prototype.loop = function(callback, count) {
    var that = this;
    var next = function (err) {
            var index = that._stack.length;
            if(index <= 0 || err) return;
            count = (count || 1);
            var item = that._stack.splice(-count);
            item.map(function (i) {
                that._visited.push(i);
            });
            callback(null, item, next);
        };

    next();
};

MemoryQueue.prototype.isQueued = function (id, callback) {
    var len = this._visited.length - 1, found = false;
    for (var i = 0; i < len; i++) {
        var item = this._visited[i];
        if(item && item.id === id){
            found = true;
            break;
        }
    }
    callback(null, found);
};

exports = module.exports = MemoryQueue;