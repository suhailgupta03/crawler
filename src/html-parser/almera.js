const crypto = require('crypto');
const moment = require('moment');

let _process = (parser, fileName) => {

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
        throw new Error('Invalid format for fislename');

    let postURL = Buffer.from(fileNameSplit[3], 'hex').toString();

    let $ = parser;

    let postWrapper = $('.post_wrapper');

    postWrapper = Array.from(postWrapper);

    let tresponse = {};

    if (postWrapper.length > 0) {
        // Posts detected!!
        let postTitle = $('#forumposts .cat_bar .catbg').text();
        postTitle = postTitle.replace(/\([\w\s]+\)$/g, '').trim(); // Main post title

        for (let post of postWrapper) {
            let authorName = $(post).find('.poster h4 a').text();
            let postM = $(post).find('.postarea .post .inner').text();
            let title = $(post).find('.postarea .flow_hidden .keyinfo h5 a').text(); // Reply post title
            let postDate = $(post).find('.postarea .flow_hidden .keyinfo .smalltext').text();
            postDate = postDate.replace('»', '').replace('«', '').replace('เมื่อ:', '');

            let profile = $(post).find('.poster ul .avatar').first();
            /**
             * Note: Do not use pseudo class :first
             * @see https://github.com/cheeriojs/cheerio/issues/575
             */
            let profileLink = '', profileImage = '';
            if (profile) {
                profileLink = $(post).find('.poster ul .avatar').first().find('a').attr('href');
                profileImage = $(post).find('.poster ul .avatar').first().find('a img').attr('src');
            }

            let postFormActionURL = $('#quickModForm').attr('action');
            let postTopicKV = postFormActionURL.match(/topic=[\w\.]+/g);
            let postId;
            if (postTopicKV) {
                postId = postTopicKV[0].replace('topic=', '').trim();
            } else {
                postId = crypto.randomBytes(8).toString('hex'); // Generate the custom ID
            }

            let _pdata = {
                summary: postM,
                author_link: profileLink,
                pubdate: postDate,
                link: postURL,
                title: title
            };

            if (tresponse.data)
                tresponse.data.push(_pdata);
            else
                tresponse.data = [_pdata];
        }

        /**
         * Note: 
         * At the moment of writing this parser almerathailand.com
         * doesn't give a publishing date of the topic. Considering 
         * parsed date equal to the publishing date
         */
        let parsedDate = moment().unix(); // Unix timestamp
        tresponse.parsedDate = parsedDate;
    }

    return tresponse;
}

if (process.argv[2] == 'debug') {
    let r = _process(
        require('cheerio').load(require('fs').readFileSync('/home/suhail/circus/crawler/url_data/download/cr_1504692969_09b46ca134656bd7_687474703a2f2f616c6d657261746861696c616e642e636f6d2f696e6465782e7068703f746f7069633d3233343337.html')),
        'cr_1504692969_09b46ca134656bd7_687474703a2f2f616c6d657261746861696c616e642e636f6d2f696e6465782e7068703f746f7069633d3233343337.html'
    );

    console.log(r);
}


module.exports = _process;