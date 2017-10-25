const cheerio = require('cheerio')
const fs = require('fs');
const path = require('path');

class Hnalyzer {

    static parse(filePath, {filter, htmlParser}) {
        if (filePath) {
            let ext = path.extname(filePath);
            if (ext.toLowerCase() == '.html') {
                try {
                    // Load and begin parsing
                    const $ = cheerio.load(fs.readFileSync(filePath));
                    let responseList = Hnalyzer.loadParser(htmlParser)($, filePath, {filter});
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

    /**
     * Dynamically loads the HTML parser based upon the
     * name string passed
     * @param {String} name 
     */
    static loadParser(name) {
        let parser;
        switch(name) {
            case 'almera':
                parser = require('./almera');
                break;
            case 'lowyat':
                parser = require('./lowyat');
                break;
            case 'complaintsboard':
                parser = require('./complaintsboard');
                break;
            default:
                break;
        }
        return parser;
    }
}

module.exports = Hnalyzer;