var _ = require('underscore');
var async = require('async')
var MemoryQueue = require('./queue/memory');
var urlUtil = require('url');
var http = require('http');
var iconv = require('iconv-lite');

var attributes = {
    'queue': new MemoryQueue(),
    'debug': false,
    'proxylist': null,
    'worker': 5,
    'handler': {},
    'middleware': []
};

var parser = exports = module.exports = {};
var pattern = /<a\s*href\s*=\s*(\"([^"]*\")|'[^']*'|([^'">\s]+))/gi;
var withproxy = false;

var history = {
    _data: {},

    push: function (url) {
        this._data[url] = true;
        return this;
    },

    clear: function () {
        this._data = {};
        return this;
    },

    has: function (url) {
        return this._data[url];
    }
};

var getHandler = function (url) {
    try {
        var urlObj = urlUtil.parse(url);
    } catch(e) {
        return null;
    }

    var nameHandler = urlObj.protocol + "//" + urlObj.hostname;
    var handler = attributes.handler[nameHandler];
    return handler;
};

var httpcli = function (url, callback) {
    try {
        var urlObj = urlUtil.parse(url);
    } catch(e) {
        callback(e);
        return;
    }

    var handler = getHandler(url);

    var statusCode = 404;
    var req = http.request(urlObj, function (res) {
        statusCode = res.statusCode;
        if(statusCode === 301 || statusCode == 302) {
            process.nextTick(function() {
                httpcli(res.headers.location, callback);
            });
        }

        var body = [];
        res.on('data', function(chunk) {
            if(statusCode === 200) {
                body.push(chunk);
            }
        });

        res.on('end', function() {
            if(statusCode === 200) {
                if(handler.encoding) {
                    callback(null, res, iconv.decode(Buffer.concat(body), handler.encoding));
                } else {
                    callback(null, res, Buffer.concat(body));
                }
            }
        });
    });

    req.on('error', function(err) {
        callback(err);
    });

    req.end();
};


var filter = {
    optionalParam: /\((.*?)\)/g,
    namedParam: /(\(\?)?:\w+/g,
    splatParam: /\*\w+/g,
    escapeRegExp: /[\-{}\[\]+?.,\\\^$|#\s]/g,

    data: [],

    create: function (path, data) {
        if (_.isArray(path)) {
            _.each(path, function (p) {
                filter.data.push({
                    regexp: filter._wrapper(p),
                    data: data
                });
            });
        } else {
            filter.data.push({
                regexp: filter._wrapper(path),
                data: data
            });
        }
    },

    get: function (path) {
        var result = null;
        filter.data.map(function (pattern) {
            if (pattern.regexp.exec(path)) {
                result = pattern;
            }
        });
        return result;
    },

    test: function (hostname) {
        var result = false;
        _.each(this.data, function (h) {
            if (hostname.indexOf(h.data.hostname) !== -1) {
                result = true;
                return;
            }
        });
        return result;
    },

    clear: function () {
        filter.data = [];
    },

    _wrapper: function (path) {
        path = path.replace(filter.escapeRegExp, '\\$&')
            .replace(filter.optionalParam, '(?:$1)?')
            .replace(filter.namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(filter.splatParam, '([^?]*?)');
        return new RegExp('^' + path + '(?:\\?([\\s\\S]*))?$');
    }
};

parser.configure = function (options) {
    _.extend(attributes, (options || {}));
};

parser.run = function (callback, done) {
    async.waterfall([
            //prepare handler
            function (next) {
                async.eachSeries(Object.keys(attributes.handler), function (item, hnext) {
                    var handler = attributes.handler[item];
                    attributes.queue.push(item, function (err) {
                        if (err) {
                        }

                        if (!handler['filter']) {
                            handler['filter'] = [];
                        }

                        var paths = _.isFunction(handler['filter'])
                            ? handler['filter']() || []
                            : handler['filter'];

                        filter.create(paths, {
                            hostname: item,
                            handler: handler
                        });

                        hnext();
                    });
                }, function (err) {
                    next();
                });
            },
            //prepare middleware
            function (next) {
                prepareMiddleware(function () {
                    next();
                });
            }],

        function (err, result) {
            attributes.queue.get(function (errq, items, qnext) {
                var workers = [];
                if (!items) {
                    if (_.isFunction(done)) {
                        history.clear();
                        done();
                    }
                    return;
                }
                items.map(function (item) {
                    if (!history.has(item)) {
                        workers.push(function (wnext) {
                            process(item, wnext);
                        });
                    }
                });
                async.parallel(workers, function (err, result) {
                    var data = [];
                    if (_.isArray(result)) {
                        result.map(function (item) {
                            if (item) data.push(item);
                        });
                    }
                    callback(err, data, qnext);
                });
            }, attributes.worker);
        });
};

function prepareMiddleware(callback) {
    setTimeout(function () {
        console.log('middleware done');
        callback();
    }, 10);
};


function process(item, next) {
    var dst = item.id;

    if (history.has(dst)) {
        next();
        return;
    } else {
        history.push(dst);
    }

    httpcli(dst, function (err, res, body) {
       if(err) {
          next();
       }

       var handler = filter.get(dst);

       if (handler && _.isFunction(handler.data.handler['parse'])) {
           handler.data.handler.parse(dst, body, function (data) {
               findLinks(dst, body, function (err, links) {
                   next(err, data);
               });
           });
       } else {
           findLinks(dst, body, function (data) {
               next(null);
           });
       }
    });
};

function findLinks(dst, rawHtml, callback) {
    var links = rawHtml.match(pattern) || [];
    async.eachSeries(links, function (link, lnext) {
        link = link.replace(/<a\s*href\s*=\s*(["|'])|(["|'])/g, '');
        link = trim(link);
        if (link.indexOf("http") === -1
            && link.indexOf("https") === -1) {
            if (link !== '#') {
                var parentUrl = urlUtil.parse(dst);
                link = parentUrl['protocol'] + '//' + parentUrl['host'] + '/' + slash.ltrim(link);
            }
        }
        if (isNotValidUrl(link)) {
            lnext();
        } else {
            if (filter.test(link)) {
                attributes.queue.push(link, function (err) {
                    lnext();
                });
            } else {
                lnext();
            }
        }

    }, function (err) {
        callback(err);
    });
};

function trim(text) {
    return text.replace(/^\s+|\s+$/g, "");
};

function isNotValidUrl(url) {
    var re = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/;
    return !re.test(url);
};

var slash = {
    ltrim: function (path) {
        return path.replace(/^\//, '');
    },

    rtrim: function (path) {
        return path.replace(/\/$/, '');
    }
};





