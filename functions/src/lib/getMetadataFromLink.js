const getMetaData = require("metadata-scraper");

/**
 * Given a link/url as a string, retrieve metadata about the website.
 * Namely, get the title and the favicon url.
 *
 * @async HTTP Request
 * @param {string} list
 * @returns {object} Website object containing url, title, and favicon
 * @throw Error from getMetaData
 */
async function getMetadataFromLink(link) {
    try {
        const metadata = await getMetaData(link);
        return {
            url: link, // maybe metadata.url
            title: metadata.title,
            favicon: metadata.icon,
        };
    } catch (err) {
        throw err;
    }
}

module.exports.getMetadataFromLink = getMetadataFromLink;
