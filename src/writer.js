const fs = require('fs');
const Promise = require('bluebird');
const crypto = require('crypto');
const moment = require('moment');

Promise.promisifyAll(fs);

module.exports.writer = class Writer {

    static write(content, location) {
        if(!content)
            return Promise.resolve();
        if(!location)
            return Promise.reject('Cannot write to an empty location');

        let fileName = `cr_${crypto.randomBytes(32).toString('hex')}_${moment().unix()}.html`;
        location = `${location}/${fileName}`;
        location = location.replace(/[\/]{2,}/g,'/');
        return fs.writeFileAsync(location, content);
    }
}