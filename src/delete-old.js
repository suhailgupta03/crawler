const Promise = require('bluebird');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

Promise.promisifyAll(fs);


async function delFiles(fpath, days = 4) {
    try {
        // Get the file list
        let fileList = await fs.readdirAsync(fpath);
        // Filter the list with .html files
        fileList = fileList.filter(file => {
            return path.extname(file) == '.html'
        });
        // Now filelist only contains the HTML files
        fileList.map(async (file) => {
            // UNIXTIMESTAMP_EIGHTRANDOMBYTES_HEXACONVERTEDPOSTURL.html
            let fileBreak = file.split('_');
            let fileTS = fileBreak[1];
            if (moment().diff(moment.unix(fileTS), 'days') >= days) {
                // Delete the files that are atleast 3 days old
                await fs.unlinkAsync(`${fpath}/${file}`);
                // Deleted the file
            }
        })
    } catch (err) {
        console.log(err);
    }

}

module.exports = delFiles;