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

