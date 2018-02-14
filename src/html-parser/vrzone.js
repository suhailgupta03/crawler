const crypto = require('crypto');
const moment = require('moment');
const md5 = require('md5');

let _process = (parser, fileName, { filter }) => {

    /**
     * filename format:
     * UNIXTIMESTAMP_EIGHTRANDOMBYTES_HEXACONVERTEDPOSTURL.html
     * 
     * HEXACONVERTEDPOSTURL: Post URL converted to hexa decimal
     * Example:
     * cr_1504692969_09b46ca134656bd7_687474703a2f2f616c2e7068703f746f7069633d3233343337.html
     */

    let filePattern = fileName.match(/cr_[^.html]+/);
    if (filePattern)
        fileName = filePattern[0];
    else
        throw new Error('Invalid filename received');

    let fileNameSplit = fileName.split('_');
    if (fileNameSplit.length != 4)
        throw new Error('Invalid format for filename');

    // Example: https://www.complaintsboard.com/complaints/vons-delivery-service-customer-service-c924601.html
    let postURL = Buffer.from(fileNameSplit[3], 'hex').toString();

    let $ = parser;


    if ($('.entry-content') && $('.entry-content').text()) {
        // Main post detected!

        let title = $('.entry-title').text();
        let author = $($('.post-author .author.vcard .url')[0]).text();

        let publishedDate = $($('.entry-date.published.updated')[0]).text();
        publishedDate = moment(publishedDate, "MMMM Do YYYY").toISOString();

        let summary = $('.entry-content').text().trim();
        let authorLink = $('.author-image').attr('href');

        let include = true;
        if (!filter)
            filter = '--false--';

        if (!postM.includes(filter) && filter !== '--false--') { // Cannot include this post if it does not match the 
            // filter criteria
            include = false;
        }

        let tresponse = {};
        
        if (include) {
            let _pdata = {
                summary,
                author_link: authorLink,
                pubdate: publishedDate,
                link: postURL,
                title,
                author,
                date: moment(publishedDate).format('DD/MM/YY hh:mm:ss'),
                id: md5(postURL),
                tags: []
            };
            tresponse.data = [_pdata];
        }
    }

    if (!tresponse.data)
        tresponse.data = [];

    let parsedDate = moment().unix(); // Unix timestamp
    tresponse.parsedDate = parsedDate;


    return tresponse;
}


module.exports = _process;