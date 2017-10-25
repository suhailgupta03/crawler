const request = require('request');
const URL = require('url');
const chalk = require('chalk');
const Queue = require('queue-fifo');
const Promise = require('bluebird');
const json2csv = require('json2csv');
const fs = require('fs');
const moment = require('moment');
const Table = require('cli-table');
let winston = require('winston');
let writer = require('./writer').writer;
const { fork } = require('child_process');

let errL = chalk.red;
let warL = chalk.yellow;
let sucL = chalk.green;
let statsL = chalk.black;

Promise.promisifyAll(fs);

const anchorPattern = /<a[^>]*>([^<]+)<\/a>/g;

module.exports.ucrawler = class UCrawler {

    constructor(seedList = [], options = {}) {
        this.recursionDepth = 5;
        this.seedQueue = new Queue();

        for (let seed of seedList) {
            this.seedQueue.enqueue(seed);
        }

        let { logger, csvWriteDir, createHTML, htmlWriteLocation, watchDir, watch, htmlParser } = options;
        if (logger) {
            if (logger !== winston) {
                console.log(warL.bold(`Not using Winston as the default logger. It is 
                            recommended to use winston as the logger. See https://github.com/winstonjs/winston`));
            }
            winston = logger;
        }
        if (csvWriteDir) {
            this.writeDir = csvWriteDir;
            console.log(warL(`CSV writer pointed to ${this.writeDir}`));
        }
        else
            console.log(warL(`Not received CSV writing directory. Shifting to use the current directory for logging`));

        if (watch) {
            console.log(warL(`Directory watch will be activated at ${watchDir}`));

            /**
             * Fork the cluster process
             * Inject the watch service into the cluster
             * Note: Fork is a special instance of spawn, that runs a fresh instance of the V8 engine
             */
            const _cluster = fork('src/cluster/cluster.js', [
                '--i',
                '--activate',
                `--watch ${watchDir}`,
                `--type ${htmlParser}`
            ]);


            winston.info(`Watch activated for ${watchDir}`);
        } else
            console.log(warL(`Note: Directory watch will not be activated`));

        if (createHTML) {
            this.createHTML = true;
            this.htmlWriteLoc = htmlWriteLocation;
        }

        this.init();
    }

    init() {
        this.recursionRefMap = {};
        this.currentLevel = 0;
        this.headUrlsLoaded = false;
        this.headList = [];
        this.headSet = new Set();
        this.limeSeed = null;
        this.visitedList = [];
        this.urlContainerSet = new Set();
        this.interval = null;
        this.lastVisited = null;
    }

    /**
     * Call this function to start the URL crawl process
     */
    start() {
        this.interval = setInterval(() => {
            let table = new Table();
            const maxUTV = ((this.headSet.size * this.recursionDepth) - this.visitedList.length);
            table.push(
                { 'Loaded URLs': this.urlContainerSet.size },
                { 'Visited URLs': this.visitedList.length },
                { 'URLs to be visited': `<= ${maxUTV}` }
            );

            console.log(statsL(table.toString()));
        }, 4000);

        return this.getNextSeed();
    }

    /**
     * Used by @see start
     */
    getNextSeed() {

        winston.info('Attempting to get next seed');

        if (this.urlContainerSet.size > 0) {
            // Write the viisted URLs to .csv file
            let data = [];
            let urlContainer = Array.from(this.urlContainerSet);
            urlContainer.map(url => {
                data.push({ 'URL': url });
            });

            let csv = json2csv({ data: data });
            // Write to the fine; Written as sync operation
            let fileName;

            if (this.csvWriteDir)
                fileName = `${this.csvWriteDir}${this.parsedSeed.hostname}.csv`
            else
                fileName = `${this.parsedSeed.hostname}.csv`;

            winston.info(`Attempting to write ${fileName}`);
            fs.writeFile(fileName, csv, (err) => {
                if (err) {
                    winston.error(`Failed to write ${fileName}`);
                    throw err;
                }
                else {
                    winston.info(`Successfully created ${fileName}`);
                    console.log(sucL(`${fileName} saved`));
                }
            });
        }

        if (!this.seedQueue.isEmpty()) {

            this.urlContainerSet.clear(); // Empty the URL container at each dequeue operation
            let url = this.seedQueue.dequeue();
            this.limeSeed = url;
            let o = URL.parse(url);
            let u = `${o.protocol}//${o.host}`;
            this.seedUrl = u; // This represents only the domain name with protocol to reach the URL
            this.parsedSeed = o;
            winston.info(`With new seed, attempting to crawl ${url}`);
            return this.crawl(url, url);
        }
        else {
            const comMsg = 'All seeds traversed';
            winston.info(`${comMsg}`);
            console.log(sucL(`${comMsg}`));
            clearInterval(this.interval);
            return;
        }
    }


    /**
     * Processor of the URL crawler. 
     * @param {String} head 
     * @param {String} url 
     * @see start
     */
    crawl(head, url) {
        winston.info(`Attempting to crawl with HEAD ${head} and URL ${url}`);

        if (this.recursionRefMap[head] && this.currentLevel >= this.recursionDepth) {
            winston.info(`Changing head`);
            console.log(warL('Changing head'));
            /**
             * Max recursion level reached
             * Change head
             */
            if (this.headList.length == 0) {
                winston.info(`Seed ${this.limeSeed} completed. Finding next seed in the queue`);
                console.log(sucL(`Seed ${this.limeSeed} completed. Finding next seed in the queue`));
                return this.getNextSeed();
            } else {
                head = this.headList.pop();
                url = head;
                this.currentLevel = 0;
            }
        }

        if (!this.recursionRefMap[head])
            this.recursionRefMap[head] = [];

        if (this.visitedList.indexOf(url) != -1) {
            /**
             * If the URL is already visited
             */
            if (this.recursionRefMap[head].length == 0) {
                if (this.headList.length > 0) {
                    // Move to the next URL
                    head = this.headList.pop();
                    url = head;
                    return this.crawl(head, url);
                } else {
                    /**
                     * Move to the next seed in queue
                     */
                    winston.info(`Seed ${this.limeSeed} completed. Finding next seed in the queue`);
                    console.log(sucL(`Seed ${this.limeSeed} completed. Finding next seed in the queue`));
                    return this.getNextSeed();
                }
            } else {
                return this.crawl(head, this.recursionRefMap[head].pop());
            }
        }

        this.lastVisited = moment().unix();
        winston.info(`Attempting a request to ${url}`);
        this._request(url)
            .then(r => {
                if (this.createHTML) // Create HTML file
                    writer.writeHtml(r.body, this.htmlWriteLoc, url).catch(e => { winston.error(e) });
                return r;
            })
            .then(r => {
                winston.info(`Unix timestamp for the last request made ${this.lastVisited}`);
                let resp = r.resp;
                let body = r.body;

                ++this.currentLevel; // Increment the recursion level by 1

                let redirectDetected = false;
                let redirectURL = null;
                /**
                 * Check if there was a redirect
                 * - Redirected URL will have a different directory structure
                 * - Correct directory structure is required for effectively parsing
                 * the relative paths in the HTML document
                 */
                if (resp.request.href != url) {
                    winston.info(`Redirect detected for ${url} : New URL ${resp.request.href}`);
                    redirectDetected = true;
                    redirectURL = resp.request.href;
                }

                console.log(warL(`Visited ${url}`));
                winston.info(`Visited ${url}`);

                this.visitedList.push(url);

                if (!body) {
                    /**
                     * If the HTTP request fetched nothing
                     * ;Return by actively getting the next URL 
                     * for the head
                     */
                    console.log(errL(`\nNothing found for ${url}`));
                    winston.error(`Nothing found for ${url}`);
                    return this.crawl(head, this.recursionRefMap[head].pop());
                }

                // Get all the anchor tags using the anchor match pattern
                let anchorTags = body.match(anchorPattern);

                if (anchorTags && Array.isArray(anchorTags)) {
                    // If there was atleast one anchor tag found
                    anchorTags.map(anchor => {
                        winston.info(`Anchor received ${anchor}`);
                        // Extract the attribute 'href' from the anchor tag
                        let href = anchor.match(/href="([^\'\"]+)/);
                        if (href && (!href[0].match(/^href="#[\w]*/)
                            && !href[0].match(/^href="javascript*/)
                            && !href[0].match(/^href="mailto:/))) {

                            let link = href[1].trim();
                            winston.info(`Link extracted from anchor ${link}`);
                            if (redirectDetected) {
                                let parsed = URL.parse(redirectURL);
                                let path = parsed.path;
                                // Check if the link has back-paths
                                let relativePath_back = link.match(/[..]{2}\//g);
                                if (relativePath_back)
                                    link = this.createUrlFromBackPaths(relativePath_back, path, link);
                                // If link has path relative to current directory
                                let relativePath_curr = link.match(/^[.]{1}\//);
                                if (relativePath_curr) {
                                    link = link.replace(/^[.]{1}/, '');
                                    link = `${this.seedUrl}${path}/${link}`;
                                }
                            }

                            // If the redirect was not detected but URL has back-paths
                            if (link.match(/^[.]{2}/g)) {
                                let parsed = URL.parse(link);
                                let h = parsed.host;
                                let path = parsed.path;
                                let relativePath_back = link.match(/[.]{2}\//g);
                                let directoryToMoveBack = relativePath_back.length;
                                if (!h) {
                                    let p = URL.parse(url).path;
                                    let brokenDirectories = p.match(/\/[\w]+/g);
                                    brokenDirectories.splice(-1, directoryToMoveBack);
                                    let newPath = brokenDirectories.join('');
                                    link = `${this.seedUrl}${newPath}`;
                                } else {
                                    link = this.createUrlFromBackPaths(relativePath_back, path, link);
                                }
                            }

                            // Replace ./ with nothing
                            link = link.replace(/^[.]\//, '');

                            let ob = this.parsedSeed;
                            let ur = `${ob.protocol}//${ob.host}`;

                            if (link.match(/^\/\//))
                                link = `${ob.protocol}${link.replace(/^\/\//, '')}`;
                            else if (link.match(/^[\/][\w\?\-&|;=\/]+/))
                                link = `${ur}/${link.match(/^[\/][\w\?\-&|;=\/]+/)[0].replace(/^\//, '')}`;
                            else if (link.match(/^[^http\/]+/g))
                                link = `${ur}/${link}`;

                            if (link.match(/^(https|http):[\w]/)) {
                                let protocol = link.match(/^(https|http)/);
                                link = link.replace(`${protocol[0]}:`, `${protocol[0]}://`);
                            }

                            if (!this.headUrlsLoaded) {
                                if (URL.parse(link).hostname == this.parsedSeed.hostname) {
                                    // Traverse URLs that belong to the same web application
                                    let parsed = URL.parse(link);
                                    link = `${parsed.protocol}//${parsed.hostname}${parsed.path.replace(/\/{2,}/g, '/')}`;
                                    this.headSet.add(link);
                                    this.urlContainerSet.add(link);
                                } else
                                    winston.info(`Ignoring ${link}`);
                            }
                            if (URL.parse(link).hostname == this.parsedSeed.hostname) {
                                let parsed = URL.parse(link);
                                // Replace all forward slashes that occur more than once
                                link = `${parsed.protocol}//${parsed.hostname}${parsed.path.replace(/\/{2,}/g, '/')}`;
                                this.recursionRefMap[head].push(link);
                                this.urlContainerSet.add(link);
                            } else
                                winston.info(`Ignoring ${link}`);
                        }
                    });

                    if (!this.headUrlsLoaded) {
                        this.headList = Array.from(this.headSet);
                        this.headUrlsLoaded = true;
                        // Head list has been initialized
                        winston.info(`Head list ${JSON.stringify(this.headList)}`);
                    }
                }

                if (this.recursionRefMap[head].length > 0)
                    return this.crawl(head, this.recursionRefMap[head].pop());
                else {
                    this.currentLevel = this.recursionDepth;
                    return this.crawl(head, null); // Will proceed to the next seed
                }
            })
            .catch(e => {
                winston.error(e);
                console.log(errL(e));
            });
    }

    /**
     * Wrapper for request module
     * @param {String} url 
     */
    _request(url) {

        if (!url)
            return Promise.reject('Request URL cannot be empty');

        return new Promise((res, rej) => {
            request(url, (err, resp, body) => {
                if (err)
                    rej(err);
                else
                    res({
                        resp: resp,
                        body: body
                    });
            });
        });
    }

    createUrlFromBackPaths(relativePath_back, path, link) {
        // Count the number of directories to move back
        let directoryToMoveBack = relativePath_back.length;
        // Get the directories in the path
        // - /welcome/to/my/directory --> 4 directories
        let brokenDirectories = path.match(/\/[\w]+/g);
        /**
         * Delete equivalent number of directories from the
         * directory list as specified with 
         * number-of-directories-to-move-back
         */
        brokenDirectories.splice(-1, directoryToMoveBack);
        // Get the new path after deleting directories from the list
        let newPath = brokenDirectories.join('');
        // Form the new link
        link = `${this.seedUrl}${newPath}/${link.replace(/[.]{2}[\/]/g, '')}`;
    }
}