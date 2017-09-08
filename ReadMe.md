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

**Start cluster module**
> node src/cluster/cluster.js --i --activate --watch /path/to/dir depth 0

or

    yarn run cluster
 
 **Start crawler module**

    yarn run test

>  Make sure to edit the relevant paths inside the .env file and
> package.json

Install Elastic Search To Use With Crawler
--------------
[Ubuntu](https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html)

    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
    
    sudo apt-get install apt-transport-https
    echo "deb https://artifacts.elastic.co/packages/5.x/apt stable main" | sudo tee -a /etc/apt/sources.list.d/elastic-5.x.list
    
    sudo apt-get update && sudo apt-get install elasticsearch
    
    Use the update-rc.d command to configure Elasticsearch to start automatically when the system boots up:
    
    sudo update-rc.d elasticsearch defaults 95 10
    
    Elasticsearch can be started and stopped using the service command:
    
    sudo -i service elasticsearch start
    sudo -i service elasticsearch stop