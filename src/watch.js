const chokidar = require('chokidar');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

module.exports.watch = class Watch {


    /**
     * Initialize the watch service
     * @param {String} dirname 
     * @param {Object} options 
     */
    constructor(dirname, options) {
        this.dirname = dirname;
        this.options = options;
    }

    /**
     * Returns promise that resolves to an event listener
     * @param {String} dirName Name of the directory to watch for
     * @param {Object} options 
     * @see https://github.com/paulmillr/chokidar For the events emitted
     */
    activateWatch() {

        if (!this.dirname)
            return Promise.reject('Directory name cannot be empty');

        return fs.statAsync(this.dirname)
            .then(stats => {
                if (!stats.isDirectory())
                    throw new Error(`${this.dirname} is not a directory`);
                else
                    return true;
            })
            .then(status => {
                let op = this.options ? this.options : {};

                let depth = op.depth ? op.depth : 0;

                return chokidar.watch(this.dirname, {
                    usePolling: true,
                    depth: depth
                });

            })

    }
}