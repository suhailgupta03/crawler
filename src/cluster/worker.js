
const WORKER_ACTION_TYPE = {
    'PROCESS_FILE': '_PROCESS_FILE'
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
                try {
                    let r = await Worker[action]();
                    process.send({
                        status: true,
                        message: 'ok',
                        type: WORKER_RESPONSE_TYPE.WORK_DONE
                    });
                } catch (err) {
                    response.status = false;
                    response.message = err.message;
                    return response;
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

    static _process_file() {
        let response = Worker.childResponseTemplate();
        return Promise.resolve(response);
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