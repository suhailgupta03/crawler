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
    'https://www.complaintsboard.com/complaints/dominos-pizza-pizza-and-service-c932766.html'
];

let crawler = new ucrawler(seedList, {
    csvWriteDir: process.env.URL_DIR,
    logger: winston,
    createHTML: process.env.CREATE_HTML == 'true' ? true : false,
    htmlWriteLocation: process.env.HTML_WRITE_DIR,
    watchDir: process.env.WATCH_DIR,
    watch: process.env.WATCH == 'true' ? true : false,
    htmlParser: 'complaintsboard'
});

crawler.start();
