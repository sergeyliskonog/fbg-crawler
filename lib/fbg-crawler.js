var _ = require("underscore");
var async = require("async");

exports.MemoryQueue   =  require('./queue/memory');
exports.MongoDBQueue  =  require('./queue/mongodb');
exports.RedisQueue    =  require('./queue/redis');
exports.HttpHeader    =  require('./http-header');

var FbgCrawler = function (options) {

};

FbgCrawler.prototype.run = function (callback) {
    var that = this;

    setTimeout(function () {
        _.bind(callback, that);
    }, 1000);
};


exports.create = function (options) {
    return new FbgCrawler(options);
};