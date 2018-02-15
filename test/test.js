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
    'http://vrzone.com/',
    'http://vrzone.com/articles/category/gaming',
    'http://vrzone.com/articles/category/personal-technology',
    'http://vrzone.com/articles/category/smart-living',
    'http://vrzone.com/articles/category/motoring',
    'http://vrzone.com/articles/category/virtual-reality-augmented-reality',
    'http://vrzone.com/articles/category/news/page/5',
    'http://vrzone.com/articles/category/news/page/4',
    'http://vrzone.com/articles/category/news/page/3',
    'http://vrzone.com/articles/category/news/page/2',
    'http://vrzone.com/articles/category/news/page/1',
    'http://vrzone.com/articles/category/motoring/page/2',
    'http://vrzone.com/articles/category/motoring/page/3',
    'http://vrzone.com/articles/category/motoring/page/4',
    'http://vrzone.com/articles/category/motoring/page/24',
    'http://vrzone.com/articles/category/motoring/page/10',
    'http://vrzone.com/articles/category/gaming/page/2',
    'http://vrzone.com/articles/category/gaming/page/5',
    'http://vrzone.com/articles/category/gaming/page/590',
    'http://vrzone.com/articles/category/gaming/page/200',
    'http://vrzone.com/articles/category/gaming/page/100',
    'http://vrzone.com/articles/category/gaming/page/50',
    'http://vrzone.com/articles/category/personal-technology/page/2',
    'http://vrzone.com/articles/category/personal-technology/page/5',
    'http://vrzone.com/articles/category/personal-technology/page/100',
    'http://vrzone.com/articles/category/personal-technology/page/20',
    'http://vrzone.com/articles/category/personal-technology/page/50',
    'http://vrzone.com/articles/category/smart-living/page/3',
    'http://vrzone.com/articles/category/virtual-reality-augmented-reality/page/2',
    'http://vrzone.com/articles/category/virtual-reality-augmented-reality/page/5',
    'http://vrzone.com/articles/category/virtual-reality-augmented-reality/page/10',
    'http://vrzone.com/articles/category/virtual-reality-augmented-reality/page/4'

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

setInterval(() => {
    crawler.start();
}, 2 * 60 * 60 * 1000)