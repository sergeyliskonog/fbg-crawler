var _ = require("underscore");
var async = require("async")
var MemoryQueue   =  require('./queue/memory');
var request = require("request");
var urlUtil = require("url");

var attributes = {
    'queue'  : new MemoryQueue(),
    'debug'  : false,
    'worker' :  5,
    'handler': {},
    'middleware': []
};

var parser = exports = module.exports = {};
var filters = [];
var targets = [];
var pattern = /\s*href\s*=\s*(\"([^"]*\")|'[^']*'|([^'">\s]+))/gi;

parser.configure = function(options) {
    _.extend(attributes, (options || {}));
};

parser.run = function(callback) {
    async.waterfall([
        function(next) {
            prepareHandler(function() {
                _.each(attributes.handler, function (handler, key) {
                     key = slash.rtrim(key);
                     var filterFn = _.isFunction(handler.filterPath)
                                  ? handler.filterPath()
                                  : [];
                     var targetFn = _.isFunction(handler.targetPath)
                                  ? handler.targetPath()
                                  : [];
                    _.each(filterFn, function(path) {
                        path = slash.ltrim(trim(path));
                        filters.push({
                            'hostname': slash.rtrim(key),
                            'path'    : path,
                            'url'     : key + (path ? "/" : "")
                        });
                    });

                    _.each(targetFn, function (path) {
                        targets.push({

                        });
                    });
                });
                next();
            });
        },

        function(next) {
            prepareMiddleware(function() {
                next();
            });
        }],

    function(err, result) {
        crawler(function() {

        });
    });
};

function prepareHandler(callback) {
   async.each(Object.keys(attributes.handler),
   function(item, next) {
      attributes.queue.push(item, function() {
          next();
      });
   },
   function(err) {
       console.log(err);
       console.log('handler done');
       callback();
   });
};

function prepareMiddleware(callback) {
    setTimeout(function() {
       console.log('middleware done');
       callback();
    }, 10);
};


function process(item, next) {
    var dst = item.id;
    request(dst, function(err, res, body) {
        var links = body.match(pattern) || [];
        var index = links.length;

        async.doWhilst(
         function (iter) {
            index--;
            var link = links[index];
            if(!link) {
               iter(new Error());
               return;
            }
            link = link.replace(/href\s*=\s*(["|'])|(["|'])/g, '');
            link = trim(link);

            var path = getPath(link);
            var id = "";

            if (path) {
                 if (link.indexOf("http") == -1) {
                     id = path.hostname + (link.indexOf("/") == -1 ? "/" + link : link);
                 } else {
                     id = link;
                 }

                 console.log(id);
                 iter();

            } else {
               iter();
            }
         },
         function () {
            return index > 0;
         },
         function (listErr) {
            if(listErr) {
               console.log('list error');
            }
            next();
        });
    });
};

function crawler(callback) {
   console.time('timer');
   attributes.queue.get(function(err, items, qnext) {
       var workers = [];
       items.map(function(item) {
           workers.push(function(wnext) {
               process(item, wnext);
           });
       });
       async.parallel(workers, function(err, result) {
           console.timeEnd('timer');
           qnext();
       });

   }, attributes.worker);
};

function trim (text) {
    return text.replace(/^\s+|\s+$/g,"");
};

var slash = {
    ltrim: function (path) {
       return path.replace(/^\//, '');
    },

    rtrim: function (path) {
       return path.replace(/\/$/, '');
    }
};

function getPath (path) {
    var result = null;
    //var path = path.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    _.each(filters, function (o, i) {
        console.log(path, ' = ', o.path);
         var regexp = new RegExp("^"+ path, 'g');
         if(regexp.test(o.path)) {
            result = o;
            return;
         }
    });
    return result;
};




