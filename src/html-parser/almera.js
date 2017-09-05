const crypto = require('crypto');

module.exports.process = (parser) => {
    let $ = parser;

    let postWrapper = $('.post_wrapper');

    postWrapper = Array.from(postWrapper);

    let responseList = [];

    if (postWrapper.length > 0) {
        // Posts detected!!
        let postTitle = $($('#forumposts .cat_bar .catbg').children()[2]).text();
        postTitle = postTitle.replace(/\([\w\s]+\)$/g, '').trim(); // Main post title

        for (let post of postWrapper) {

            let authorName = $(post).find('.poster h4 a font font').text();
            let post = $(post).find('.postarea .post .inner').text();
            let title = $(post).find('.postarea .flow_hidden .keyinfo a font').text(); // Reply post title
            let postDate = $($(post).find('postarea .flow_hidden .keyinfo .smalltext').children()[2]).text();
            postDate = postDate.replace('»', '');

            let profile = $(post).find('.poster ul .avatar:first');
            let profileLink = '', profileImage = '';
            if (profile) {
                profileLink = $(post).find('.poster ul .avatar:first a').attr('href');
                profileImage = $(post).find('.poster ul .avatar:first a img').attr('src');
            }

            let postFormActionURL = $('#quickModForm').attr('action');
            let postTopicKV = postFormActionURL.match(/topic=[\w\.]+/g);
            let postId;
            if (postTopicKV) {
                postId = postTopicKV[0].replace('topic=', '').trim();
            } else {
                postId = crypto.randomBytes(8).toString('hex'); // Generate the custom ID
            }

            responseList.push({

            })
        }
    }


}