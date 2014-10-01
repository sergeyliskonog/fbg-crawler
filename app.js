var crawler = require("./lib/fbg-crawler");
var htmlparser = require("htmlparser");
var iconv = require("iconv-lite");

crawler.configure({
    worker: 3,
    handler: {
        'http://menu-sovet.ru': {
            encoding: "windows-1251",
            filter: ['http://menu-sovet.ru/:recipe/:page.html'],
            parse: function (url, rawHtml, next) {

            }
        }
    }
});

crawler.run(function (err, result, next) {
    if (result.length > 0) {
        console.log('res', result);
    }
    next();
}, function () {
    console.log('done!');
});



