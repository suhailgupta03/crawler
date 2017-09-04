const Worker = require('./worker');
const Queue = require('queue-fifo');
const crypto = require('crypto');

const engagementStatus = {
    'ENGAGED': 'engaged',
    'IDLE': 'idle'
};

module.exports = class Master {


    constructor(cluster) {
        this.cluster = cluster;

        if (cluster.isMaster) {
            if (!this.cluster)
                throw new Error('Cannot start master without having the cluster reference');

            this.totalWorkers = 0;
            this.workersOnline = 0;
            this.workerList = [];
            this.jobQueue = new Queue();
            this.workerRoster = {};
            this.serviceMap = {};
        }
    }

    activate(workersToSpawn) {
        if (this.cluster.isMaster) {
            this.start(workersToSpawn); // Start the master process
            this.masterActivated = true;
        }
        return this;
    }

    get masterActivated() {
        return this.masterActivated;
    }

    set masterActivated(activated) {
        this.masterActivated = activated;
        return this;
    }

    /**
     * Attach the file system watch
     * @param {Object} watch 
     * @param {Boolean} activate 
     */
    attachFsWatch(watch, activate) {
        if (this.cluster.isMaster) {
            this.serviceMap['watch'] = watch;
            if (activate) {
                if (!this.masterActivated) {
                    throw new Error('Cannot activate the watch service without activating the cluster');
                    return;
                }

                this.serviceMap['watch'].activateWatch()
                    .then(poll => {
                        poll.on('add', (path) => {
                            this.queue(path); // Add the job received into the master queue;
                            // Queue is actively monitored and jobs are delegated to the 
                            // workers in the FIFO manner
                        });
                    })
                    .catch(err => {
                        console.log(errL(err));
                    })
            }
        }
        return this;
    }

    /**
     *  Note: It is important to keep the master process
     * short and only in charge of managing workers
     */
    start(workerCount) {

        if (this.cluster.isMaster) {
            for (let i = 0; i < workerCount; i++) {
                // Fork the workers
                let worker = this.cluster.fork();
                let workerId = crypto.randomBytes(8).toString('hex');
                this.workerList.push(worker);
                this.workerRoster[workerId] = {
                    'status': engagementStatus.IDLE,
                    'ref': worker
                };
                ++this.totalWorkers;
                // Activates the message listener from workers
                this.activateMasterMessageListener(this.workerList[i]);
                // Activate the job queue monitor
                this.activateQueueMonitor();
            }
            // Activates the message listener for all workers
            Worker.activateMessageListener();
        }
    }

    /**
     * Queues the job received
     * @param {String} filePath 
     */
    queue(filePath) {
        // Put the job in queue
        this.jobQueue.enqueue(filePath);
    }

    /**
     * Increments the number of workers online 
     * by 1
     */
    workerAlive() {
        ++this.workersOnline;
        return this;
    }

    /**
     * Decrements the workers online by 1
     */
    workerDead() {
        --this.workersOnline;
        return this;
    }

    /**
     * Gets the count of total number of workers
     * that are alive
     */
    onlineWorkers() {
        return this.workersOnline;
    }

    /**
     * Gets the total number of workers forked
     * by the master
     */
    totalWorkers() {
        return this.totalWorkers;
    }

    /**
     * All messages from the worker to the 
     * master are received here
     * @param {Object} worker 
     */
    activateMasterMessageListener(worker) {

        worker.on('message', (message) => {

        });
    }

    /**
     * Activates the job queue monitor
     * Each idle worker is assigned a job in the FIFO 
     * based queue
     */
    activateQueueMonitor() {
        setInterval(() => {

            for (let workerId in this.workerRoster) {
                if (!this.jobQueue.isEmpty()) {
                    if (engagementStatus.IDLE == this.workerRoster[workerId]['status']) {
                        // Allot the processing to the worker
                        this.workerRoster[workerId]['ref'].send({
                            file: this.jobQueue.dequeue(),
                            action: 'process-file'
                        });
                        // Change the worker status from IDLE to ENGAGED
                        this.workerRoster[workerId]['status'] = engagementStatus.ENGAGED;
                    }
                }
            }
        }, 1000);
    }
}