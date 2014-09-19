console.time('timer');
var request    = require("request"),
    htmlparser = require("htmlparser"),
    url  = require('url'),
    async = require("async");

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


var queue = {
    visited: [],
    stack: [],
    index: 0,

    push: function(item, callback) {
        queue.stack.push(item);
        queue.index++;
        callback(null, 1);
    },

    pop: function(callabck, count) {
        count = (count || 1);
        var item = queue.stack.splice(-count);
        item.map(function(i){
            queue.visited.push(i);
        });
        callabck(null, item);
    },

    hasVisited: function(id, callback) {
        var len = queue.visited.length - 1, found = false;
        for(var i = 0; i < len; i++){
            var item = queue.visited[i];
            if(item && item.id === id){
                found = true;
                break;
            }
        }
        callback(null, found);
    },

    clear: function(callback) {
        queue.visited = [];
        queue.stack = [];
        callback(null, {});
    },

    allVisited: function(callback) {
        callback(null, queue.visited);
    },

    count: function(callback) {
        callback(null, queue.index);
    }
};

var index = 0;
var connection = 10;
var pages = 0;

for(var i = 0; i < 100; i++){
    queue.push({id:i, name:"item" + i}, function(){});
    index++;
}

async.doWhilst(function(next){
    var workers = [];
    queue.pop(function(err, items){
        var founded = 0;
        items.map(function(item){
            workers.push(function(nextw) {
                index--;
                setTimeout(function() {
                    nextw(null, item);
                }, 345);
            });
            founded++;
        });

        if(founded === 0) {
            next(new Error());
        } else {
            async.parallel(workers, function(err, result) {
                next();
            });
        }

    }, connection);

}, function(){
    return index >= 0;
}, function(err) {
    console.timeEnd("timer");
    console.log('done loop!');
});


// var fbg-crawler = require("fbg-crawler");
// var crawler = fbg-crawler.create({
//     queue: new Memory(),
//     worker: 10,
//     debug: true,
//     handler: {
//         "mysite.com":   Class,
//         "mysite2.com":  Class2,
//         "mysite3.com":  [Class3, Class3-3]
//     }
// });
// crawler.middleware([
//     TransformTest,
//     RemoveH1Tags,
//     HighlightSpan
// ]);
// crawler.run(function(data){
//    console.log(data);
// });

















