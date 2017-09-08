require('dotenv').config();
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const chalk = require('chalk');
const Master = require('./master');
const Watch = require('../watch').watch;
let winston = require('winston');

winston.add(winston.transports.File, {
    filename: process.env.CLUSTER_LOG_DIR,
    handleExceptions: true,
    humanReadableUnhandledException: true
});
winston.remove(winston.transports.Console);

let joinM = chalk.white.bgGreen;
let leftM = chalk.white.bgYellow;
let errL = chalk.red;

class Cluster {
    /**
     * 
     * @param {Number} workers Number of workers to be spawned
     */
    constructor({ argStr, workers }) {
        if (cluster.isMaster) {
            this.health = {
                '-1': 'RED',
                '0': 'YELLOW',
                '1': 'GREEN'
            };

            if (!workers)
                workers = numCPUs;

            this.workersToSpawn = workers; // Maximum number of workers to spawn
            this.master = new Master(cluster, { logService: winston }); // Init the master
            this.activateHealthCheckUp(); // Activates the cluster health checkup
            this.activateListeners(); // Activate general cluster listeners

            if (argStr) {
                let args = argStr.match(/[^\-]+/g);
                if (args) {
                    if (argStr.match(/[-]{2}activate/))
                        this.activate(); // Activate the watch service

                    let watch = argStr.match(/watch[\s]+[^\s]+/);
                    if (watch) {
                        let wStr = watch[0];
                        let watchDir = wStr.replace('watch', '').trim();
                        // Now get all the key value pairs
                        let options = argStr.match(/[\w]+[\s]+[\w]+/);
                        // Attach the watch service
                        this.attachWatchService(new Watch(watchDir));
                    }

                    let specificSearch = argStr.match(/[-]{2}word\s[\w]+/);
                    if(specificSearch){
                        let ssearch = specificSearch[0].replace('--word','').trim();
                        this.master.termSearch(ssearch); // Inits the term filter to be used for file processing
                    }
                }
            }
        } else
            Master.activateWorkerMessageListener(); // Activates worker message listener
    }

    /**
     * Attaches a watch service with the cluster
     * Activate the service by default
     * @param {Watch} watch 
     * @param {Boolean} activate Use false to prevent automatic start of the service
     */
    attachWatchService(watch, activate = true) {
        this.master.attachFsWatch(watch, activate);
        return this;
    }

    /**
     * Activates the cluster by invoking the master.
     * Master in turn forks the worker processes.
     */
    activate() {
        this.master.activate(this.workersToSpawn);
        return this;
    }

    /**
     * Activates a health check-up monitor for the cluster.
     * Displays the cluster status at regular intervals.
     */
    activateHealthCheckUp() {
        setInterval(() => {
            if (this.master.masterActivated) {
                let totalWorkers = this.master.totWorker();
                let workersOnline = this.master.onlineWorkers();

                if (totalWorkers == workersOnline)
                    console.log(`Cluster Health: ${chalk.green.bold.italic(this.health[1])}`);
                else if (workersOnline > 0) {
                    console.log(`Cluster Health: ${chalk.yellow.bold.italic(this.health[0])}`);
                    winston.warn('Cluster health: YELLOW')
                }
                else if (workersOnline == 0) {
                    console.log(`Cluster Health: ${chalk.red.bold.italic(this.health[-1])}`);
                    winston.error('Cluster health: RED');
                }
                let workerStats = this.master.workerStats()
                winston.info(`Engaged: ${workerStats.engaged} Idle: ${workerStats.idle}`);
                // Log the worker stats
            }
        }, 6000);
    }

    /**
     * Activates the cluster level event 
     * listeners
     */
    activateListeners() {
        /**
         * Emitted whenever a worker is forked
         * and is ready to receive incoming 
         * requests
         */
        cluster.on('online', (worker) => {
            this.master.addWorkerToRoster(worker); // Adds worker to working roster
            // Worker roster is responsible work assignment to the workers
            this.master.workerAlive(); // Increments the online-worker count by 1
            console.log(joinM(`Worker ${worker.process.pid} joined the cluster\n`));
        });

        /**
         * Emitted whenever a worker dies
         */
        cluster.on('exit', (worker, code, signal) => {
            this.master.removeWorkerFromRoster(worker); // Removes worker from the working roster
            // Note: Only workers in the worker roster are allotted task
            this.master.workerDead(); // Decrements the online-worker count by 1
            console.log(leftM(`Worker ${worker.process.pid} has left the cluster\n`));
            // Fork a new worker to keep the balance
            cluster.fork();
        })
    }
}

if (process.argv && process.argv.includes('--i')) {
    /**
     * Instantiate and proceed
     */
    let args = process.argv;
    new Cluster({
        argStr: args.slice(2, args.length).join(' ')
    });
}

module.exports = Cluster;