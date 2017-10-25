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

    // Example: https://www.complaintsboard.com/complaints/vons-delivery-service-customer-service-c924601.html
    let postURL = Buffer.from(fileNameSplit[3], 'hex').toString();

    let $ = parser;

    let postWrapper = $('.item-container .complaint');
    let tresponse = {};

    if (postWrapper && postWrapper.length > 0) {
        // Main post detected!
        let postTitle = $('td.complaint').text().trim(); // Singular
        postTitle += ` - ${$('.compl-text h1').text()}`;

        let postDate = $($('.item-container')[0]).find("span[itemprop='dateCreated']").text();
        if(!postDate)
            postDate = moment().format("MMM D, YYYY");
        postDate = moment(postDate, "MMM D, YYYY").toISOString();
        let postM = $("div[itemprop='reviewBody']").text().trim(); // Singular

        let turl = postURL.replace(".html", "")
        let postId = turl.substring(turl.lastIndexOf("-") + 1, turl.length);
        let authorName = $($('.item-container')[0]).find("span[itemprop='givenName']").text();
        let profileLink = `https://www.complaintsboard.com${$($('.item-container')[0]).find("a[itemprop='author']").attr('href')}`;

        let include = true;
        if (!filter)
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
            tresponse.data = [_pdata];
        }
    }

    if (!tresponse.data)
        tresponse.data = [];
    else console.log(tresponse)
    let parsedDate = moment().unix(); // Unix timestamp
    tresponse.parsedDate = parsedDate;


    return tresponse;
}


module.exports = _process;