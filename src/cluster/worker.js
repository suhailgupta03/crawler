const Hnalyzer = require('../html-parser/index');

const WORKER_ACTION_TYPE = {
    'PROCESS_FILE': '_PROCESS_FILE',
    'SHUT_DOWN': '_SHUT_DOWN'
}

const WORKER_RESPONSE_TYPE = {
    'WORK_DONE': '_WORK_DONE',
    'WORK_NOT_DONE': '_WORK_NOT_DONE',
    'ERROR_REPORTED': '_ERROR_REPORTED'
};

module.exports.Worker = class Worker {

    /**
     * Activates the message listener. All messages
     * from the master are received here
     */
    static activateMessageListener() {
        process.on('message', async (message) => {
            let action = message.action;
            let response = Worker.childResponseTemplate();
            if (action) {
                action = action.toLowerCase();
                let task = message.task;
                let term = message.term;
                try {
                    let r = await Worker[action]({ filePath: task, term });
                    /**
                     * Note: process.send uses JSON.stringify() internally to 
                     * serialize the message.
                     * @see https://nodejs.org/api/process.html#process_process_send_message_sendhandle_options_callback
                     * @see https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
                     */
                    process.send({
                        status: true,
                        message: 'ok',
                        type: WORKER_RESPONSE_TYPE.WORK_DONE,
                        proof: r.proof
                    });
                } catch (err) {
                    response.status = false;
                    response.message = err.message;
                    process.send({
                        status: false,
                        message: err.message,
                        type: WORKER_RESPONSE_TYPE.ERROR_REPORTED,
                        _trace: err.stack
                    }); // Report the error back to master
                }
            } else {
                let err = new Error('Invalid action received');
                process.send({
                    status: false,
                    message: err.message,
                    type: WORKER_RESPONSE_TYPE.WORK_NOT_DONE,
                    trace: err.stack
                }); // Report the error back to master
            }
        });
    }

    static async _process_file({ filePath, term }) {
        if (!filePath)
            return Promise.reject('FilePath cannot be empty');

        try {
            let response = Worker.childResponseTemplate();
            let responseList = await Hnalyzer.parse(filePath, {filter: term});
            response.proof = responseList; // proof; container of the response; the proof of work done
            return Promise.resolve(response);
        } catch (err) {
            return Promise.reject(err); // Report the error back
        }
    }

    static _shut_down(nativeWorkerId) {

    }

    static childResponseTemplate() {
        return {
            status: true,
            message: 'Successful'
        };
    }
}

module.exports.WORKER_ACTION_TYPE = WORKER_ACTION_TYPE;
module.exports.WORKER_RESPONSE_TYPE = WORKER_RESPONSE_TYPE;
