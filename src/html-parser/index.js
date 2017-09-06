const cheerio = require('cheerio')
const fs = require('fs');
const path = require('path');
const almera = require('./almera');

class Hnalyzer {

    static parse(filePath) {
        if (filePath) {
            let ext = path.extname(filePath);
            if (ext.toLowerCase() == '.html') {
                try {
                    // Load and begin parsing
                    const $ = cheerio.load(fs.readFileSync(filePath));
                    const responseList = almera($, filePath);
                    return Promise.resolve(responseList);
                }catch(err) {
                    return Promise.reject(err);
                }
            } else {
                // Can only parser HTML files
                throw new Error('Can only parse HTML files');
            }
        }
    }
}

module.exports = Hnalyzer;