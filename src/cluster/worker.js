const Hnalyzer = require('../html-parser/index');
const fs = require('fs');
const Promise = require('bluebird');
const moment = require('moment');
const crypto = require('crypto');

Promise.promisifyAll(fs);

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
                let writeLoc = message.writeLoc;
                let htmlParser = message.htmlParser;
                try {
                    let r = await Worker[action]({ filePath: task, term, writeLoc, htmlParser });
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

    static async _process_file({ filePath, term, writeLoc, htmlParser }) {
        if (!filePath)
            return Promise.reject('FilePath cannot be empty');

        try {
            let response = Worker.childResponseTemplate();
            let responseList = await Hnalyzer.parse(filePath, { filter: term, htmlParser });
            response.proof = responseList; // proof; container of the response; the proof of work done
            // Create a file with the processed data
            response.proof.system_info = getSystemInfo();
                let filename = `${moment().valueOf()}${crypto.randomBytes(16).toString('hex')}_forum_139284.json`;
            await fs.writeFileAsync(`${writeLoc}${filename}`, JSON.stringify(response.proof));
            // Wait till the file is written
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

function getSystemInfo(platform = 'forum') {
    let id;
    if ('forum' == platform)
        id = 139284;

    return {
        "id": id,
        "config_category": platform,
        "name": "https://pantip.com/tag/nissan",
        "account_id": "",
        "platform_id": "6ce32185-a789-11e4-a34f-74867a1157ba",
        "platform": "forum",
        "language_id": null,
        "country_id": "6cb624cb-a789-11e4-a34f-74867a1157ba",
        "tags": "",
        "news_config": "0"
    };
}
module.exports.WORKER_ACTION_TYPE = WORKER_ACTION_TYPE;
module.exports.WORKER_RESPONSE_TYPE = WORKER_RESPONSE_TYPE;
