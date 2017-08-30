Crawler
-------

 - URL Crawler
 

> Crawls URL for the given list of seeds. Creates a queue of the seeds and proceeds serially.  Test code to crawl a web application is given below. Input is the seed list and output is the list of URLs scanned. Maximum recursion depth is set to 5 but could be increased depending upon the use case.

    require('dotenv').config();
    const ucrawler = require('../src/index').ucrawler;
    let winston = require('winston');

    winston.add(winston.transports.File, {
        filename: process.env.URL_LOG_DIR,
        handleExceptions: true,
        humanReadableUnhandledException: true
    });
    winston.remove(winston.transports.Console);

    const seedList = [
        'http://almerathailand.com/'
    ];

    let crawler = new ucrawler(seedList, {
        csvWriteDir: process.env.URL_DIR,
        logger: winston
    });

    crawler.start();






































































































































































































































































































































































































































































































































































































































































































































