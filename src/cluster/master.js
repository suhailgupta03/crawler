const { Worker, WORKER_ACTION_TYPE, WORKER_RESPONSE_TYPE } = require('./worker');
const Queue = require('queue-fifo');
const crypto = require('crypto');
const engagementStatus = {
    'ENGAGED': 'engaged',
    'IDLE': 'idle'
};

module.exports = class Master {


    constructor(cluster, { logService }) {
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
        this.logger = logService;
    }

    activate(workersToSpawn) {
        if (this.cluster.isMaster) {
            this.start(workersToSpawn); // Start the master process
            this.masterActivated = true;
        }
        return this;
    }

    get masterActivated() {
        return this.isMasterActivated;
    }

    set masterActivated(activated) {
        this.isMasterActivated = activated;
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
                            this.logger.info(`New path added to master queue ${path}`);
                        });
                    })
                    .catch(err => {
                        this.logger.error(err);
                        console.log(errL(err));
                    })
            }
        }
        return this;
    }


    start(workerCount) {

        if (this.cluster.isMaster) {
            for (let i = 0; i < workerCount; i++) {
                // Fork the workers
                let worker = this.cluster.fork();
                let workerId = crypto.randomBytes(8).toString('hex');
                this.workerList.push(worker);
                worker._native_id = workerId;
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
            this.logger.info(`Total workers forked ${this.totalWorkers}`);
        }
    }

    /**
     * Activates the message listener for child processes
     * forked
     */
    static activateWorkerMessageListener() {
        // Activates the message listener for all workers
        Worker.activateMessageListener();
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
    totWorker() {
        return this.totalWorkers;
    }

    /**
     * Gets the worker stats
     * - Total number of engaged workers
     * - Total number of idle workers
     * @return {Object}
     */
    workerStats() {
        let idleWorkers = 0, engagedWorkers = 0;
        for(let workerId of Object.keys(this.workerRoster)) {
            let status = this.workerRoster[workerId]['status'];
            if(engagementStatus.ENGAGED == status)
                engagedWorkers++;
            else
                idleWorkers++;
        }
        return {
            idle: idleWorkers,
            engaged: engagedWorkers
        };   
    }

    /**
     * All messages from the worker to the 
     * master are received here
     * @param {Object} worker 
     */
    activateMasterMessageListener(worker) {

        worker.on('message', (message) => {
            let type = message.type;
            if (WORKER_RESPONSE_TYPE.WORK_DONE == type) {
                // Work done successfully
                // Log a success message
                this.logger.info(`${worker._native_id} completed the task`);
            } else if (WORKER_RESPONSE_TYPE.WORK_NOT_DONE == type) {
                // Worker failed to complete the task
                // Log a failure message
                this.logger.error(`${worker._native_id} failed to complete the task`);
            }
            /**
             * Irrespective of type of message received
             * change the status of worker from enagaged to
             * idle
             */
            this.workerRoster[worker._native_id].status = engagementStatus.IDLE;
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
                            action: WORKER_ACTION_TYPE.PROCESS_FILE
                        });
                        // Change the worker status from IDLE to ENGAGED
                        this.workerRoster[workerId]['status'] = engagementStatus.ENGAGED;
                        this.logger.info(`${workerId} was engaged`);
                    }
                }
            }
        }, 1000);
    }
}