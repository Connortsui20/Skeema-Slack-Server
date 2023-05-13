const { WebClient } = require("@slack/web-api");

const {
    getSkeemaMetadataWithSkeemaID,
} = require("../firebase/getSkeemaMetadata");

// ! Security bad, someone should probably rewrite this
/**
 * Given the client object and a Skeema user ID, return a list of all users
 * in the slack server.
 *
 * @async Firebase query and Slack API
 * @param {object} db Firestore database
 * @param {string} sid Skeema user ID
 * @returns {[object]} List of objects containing Slack user data
 *   User fields
 *      - uid: string (user.id)
 *      - name: string (user.name)
 *      - realName: string (user.real_name)
 * @throw Error from getSkeemaMetadata
 */
async function getUsers(db, sid) {
    let metadata;
    try {
        metadata = await getSkeemaMetadataWithSkeemaID(db, sid);
    } catch (err) {
        throw err; // raise to caller
    }

    const client = new WebClient(metadata.slackToken); // slack API client

    let userList = await client.users.list();

    let users = userList.members.filter((user) => {
        return !user.deleted && !user.is_bot;
    });
    users = users.map((user) => {
        return {
            uid: user.id,
            name: user.name,
            realName: user.real_name,
        };
    });
    return users;
}

module.exports.getUsers = getUsers;
