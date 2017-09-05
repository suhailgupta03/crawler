const cheerio = require('cheerio')
const fs = require('fs');
const path = require('path');
const almera = require('./almera').process;

let Hnalyzer = (function () {

    let pvtProps = new WeakMap();

    class Hnalyzer {

        constructor() {
            
        }

        parse(filePath) {
            if(filePath) {
                let ext = path.extname(filePath);
                if(ext.toLowerCase() == '.html') {
                    // Load and begin parsing
                    const $ = cheerio.load(fs.readFileSync(filePath));
                    almera($);
                }else {
                    // Can only parser HTML files
                    throw new Error('Can only parse HTML files');
                }
            }
        }
    }

})();