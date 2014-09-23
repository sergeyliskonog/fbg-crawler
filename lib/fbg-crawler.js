var _ = require("underscore");
var async = require("async");

exports.MemoryQueue   =  require('./queue/memory');
exports.MongoDBQueue  =  require('./queue/mongodb');
exports.RedisQueue    =  require('./queue/redis');
exports.HttpHeader    =  require('./http-header');

var attributes = {
    'queue'  : new exports.MemoryQueue(),
    'debug'  : false,
    'worker' :  5,
    'handler': {},
    'middleware': []
};

var FbgCrawler = function (options) {
    _.extend(this, _.extend(attributes, (options || {})));
};

FbgCrawler.prototype.run = function (callback, done) {
    var that = this;
    var workers = [];
    /*
    async.doWhilst(function (next) {
        that.queue.pop(function (err, items) {
            var founded = 0;
            items.map(function(item) {
                workers.push(function(n) {
                    index--;
                    setTimeout(function() {
                        n(null, item);
                    }, 345);
                });
                founded++;
            });
        }, that.worker);
    }, function () {

    }, function () {

    });*/
};

exports.create = function (options) {
    return new FbgCrawler(options);
};