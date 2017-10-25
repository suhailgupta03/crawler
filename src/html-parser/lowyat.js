const crypto = require('crypto');
const moment = require('moment');

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

    // Example: https://forum.lowyat.net/topic/4121695
    let postURL = Buffer.from(fileNameSplit[3], 'hex').toString();

    let $ = parser;

    let postWrapper = $('#topic_content');

    let tresponse = {};

    if (postWrapper) {
        // Posts detected!!
        let postTitle = $($('#topic_content .maintitle p')[1]).text();
        let authors = Array.from($('#topic_content .normalname'));
        for (let i = 0; i < authors.length; i++) {
            let authorName = $(authors[i]).text();
            let postM = $($('#topic_content .post_table .post_text')[i]).text();
            let postDate = $($('#topic_content .post_table .postdetails')[i]).text();
            postDate = postDate.trim().replace(/,\s+updated\s+/, '');
            postDate = moment(postDate, 'DDMMMMYYYY, HH:mm:ss', 'th').locale('en').toISOString();
            let profileLink = `https://forum.lowyat.net/user/${authorName}`;
            let postId = postURL.replace(/(https|http):\/\/forum.lowyat.net\/topic\//,'').split("/")[0];

            let include = true;
            if(!filter)
                filter = '--false--';
                
            if (!postM.includes(filter) && filter !== '--false--') { // Cannot include this post if it does not match the 
                // filter criteria
                include = false;
            }

            if (include) {
                let _pdata = {
                    summary: postM,
                    author_link: profileLink,
                    pubdate: postDate,
                    link: postURL,
                    title: postTitle,
                    author: authorName,
                    date: moment().format('MM/DD/YYYY HH:mm:ss'),
                    id: postId,
                    tags: []
                };

                if (tresponse.data)
                    tresponse.data.push(_pdata);
                else
                    tresponse.data = [_pdata];
            }
        }
    }

    if (!tresponse.data)
        tresponse.data = [];

    let parsedDate = moment().unix(); // Unix timestamp
    tresponse.parsedDate = parsedDate;

    return tresponse;
}


module.exports = _process;