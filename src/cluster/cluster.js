const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const chalk = require('chalk');
const Master = require('./master');
const Watch = require('../watch');

let joinM = chalk.white.bgGreen;
let leftM = chalk.white.bgYellow;
let errL = chalk.red;

module.exports = class Cluster {


    /**
     * 
     * @param {Number} workers Number of workers to be spawned
     */
    constructor(workers = numCPUs) {
        this.health = {
            '-1': 'RED',
            '0': 'YELLOW',
            '1': 'GREEN'
        };
        this.workersToSpawn = workers; // Maximum number of workers to spawn
        this.master = new Master(cluster); // Init the master
        this.activateHealthCheckUp(); // Activates the cluster health checkup
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
                let totalWorkers = this.master.totalWorkers();
                let workersOnline = this.master.onlineWorkers();

                if (totalWorkers == workersOnline)
                    console.log(chalk.green.bold.italic(this.health[1]));
                else if (workersOnline > 0)
                    console.log(chalk.yellow.bold.italic(this.health[0]));
                else if (workersOnline == 0)
                    console.log(chalk.red.bold.italic(this.health[-1]));
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
            this.master.workerAlive(); // Increments the online-worker count by 1
            console.log(joinM(`Worker ${worker.process.pid} joined the cluster\n`));
        });

        /**
         * Emitted whenever a worker dies
         */
        cluster.on('exit', (worker, code, signal) => {
            this.master.workerDead(); // Decrements the online-worker count by 1
            console.log(leftM(`Worker ${worker.process.pid} has left the cluster\n`));
            // Fork a new worker to keep the balance
            cluster.fork();
        })
    }
}