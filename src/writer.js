const fs = require('fs');
const Promise = require('bluebird');
const crypto = require('crypto');
const moment = require('moment');

Promise.promisifyAll(fs);

module.exports.writer = class Writer {

    static writeHtml(content, location, url) {
        if (!content)
            return Promise.resolve();
        if (!location)
            return Promise.reject('Cannot write to an empty location');

        /**
         * Filename convention to be followed
         * UNIXTIMESTAMP_EIGHTRANDOMBYTES_HEXACONVERTEDPOSTURL.html
         */

        let fileName = `cr_${moment().unix()}_${crypto.randomBytes(8).toString('hex')}_${Buffer.from(url).toString('hex')}.html`;
        location = `${location}/${fileName}`;
        location = location.replace(/[\/]{2,}/g, '/');
        return fs.writeFileAsync(location, content);
    }
}