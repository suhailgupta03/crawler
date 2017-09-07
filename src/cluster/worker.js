const Hnalyzer = require('../html-parser/index');

const WORKER_ACTION_TYPE = {
    'PROCESS_FILE': '_PROCESS_FILE',
    'SHUT_DOWN': '_SHUT_DOWN'
}

const WORKER_RESPONSE_TYPE = {
    'WORK_DONE': '_WORK_DONE',
    'WORK_NOT_DONE': '_WORK_NOT_DONE'
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
                try {
                    let r = await Worker[action]({ filePath: task });
                    process.send({
                        status: true,
                        message: 'ok',
                        type: WORKER_RESPONSE_TYPE.WORK_DONE,
                        proof: r.proof
                    });
                } catch (err) {
                    response.status = false;
                    response.message = err.message;
                    return Promise.reject(response);
                }
            } else {
                process.send({
                    status: false,
                    message: 'Invalid action received',
                    type: WORKER_RESPONSE_TYPE.WORK_NOT_DONE
                });
            }
        });
    }

    static async _process_file({ filePath }) {
        if (!filePath)
            return Promise.reject('FilePath cannot be empty');

        try {
            let response = Worker.childResponseTemplate();
            let responseList = await Hnalyzer.parse(filePath);
            response.proof = responseList; // proof; container of the response; the proof of work done
            return Promise.resolve(response);
        } catch (err) {
            return Promise.reject(err);
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