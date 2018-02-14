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
    // 'http://vrzone.com/',
    // 'http://vrzone.com/articles/category/gaming',
    // 'http://vrzone.com/articles/category/personal-technology',
    // 'http://vrzone.com/articles/category/smart-living',
    // 'http://vrzone.com/articles/category/motoring',
    // 'http://vrzone.com/articles/category/virtual-reality-augmented-reality',
    // 'http://vrzone.com/articles/category/news/page/5'
    'https://circussocial.com/',
    'https://circussocial.com/'
];

let crawler = new ucrawler(seedList, {
    csvWriteDir: process.env.URL_DIR,
    logger: winston,
    createHTML: process.env.CREATE_HTML == 'true' ? true : false,
    htmlWriteLocation: process.env.HTML_WRITE_DIR,
    watchDir: process.env.WATCH_DIR,
    watch: process.env.WATCH == 'true' ? true : false,
    htmlParser: 'complaintsboard',
    throttling: {
        requests: process.env.THROTTLE_MIN_HTTP_REQUEST,
        milliseconds: process.env.THROTTLE_MILLI_SECONDS
    },
    urlPatternToFollow: process.env.URL_RULE_TO_FOLLOW || null
});

crawler.start();
