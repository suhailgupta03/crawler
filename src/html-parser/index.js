const cheerio = require('cheerio')
const fs = require('fs');
const path = require('path');
const almera = require('./almera');

class Hnalyzer {

    static parse(filePath, {filter}) {
        if (filePath) {
            let ext = path.extname(filePath);
            if (ext.toLowerCase() == '.html') {
                try {
                    // Load and begin parsing
                    const $ = cheerio.load(fs.readFileSync(filePath));
                    let responseList = almera($, filePath, {filter});
                    return Promise.resolve(responseList);
                } catch (err) {
                    return Promise.reject(err); // Report the error back
                }
            } else {
                // Can only parser HTML files
                return Promise.reject('Can only parse HTML files'); // Report the error back
            }
        }
    }
}

module.exports = Hnalyzer;