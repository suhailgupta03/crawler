module.exports = class Worker {


    /**
     * Activates the message listener. All messages
     * from the master are received here
     */
    static activateMessageListener() {

        process.on('message', (message) => {
            console.log(`Worker received a job: ${message}`);
        });
    }
}