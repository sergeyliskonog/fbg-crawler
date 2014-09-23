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

    callabck(null, item);
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