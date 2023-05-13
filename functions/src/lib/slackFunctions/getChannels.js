const { WebClient } = require("@slack/web-api");

const {
    getSkeemaMetadataWithSkeemaID,
} = require("../firebase/getSkeemaMetadata");

const DEFAULT_DESCRIPTION = "No channel description";

// ! Security bad, someone should probably rewrite this
/**
 * Given the client object and a Skeema user ID, retrieve all channels
 * that the user belongs to in their Slack server.
 *
 * @async Firebase query and Slack API
 * @param {object} db Firestore database
 * @param {string} uid Skeema user ID
 * @returns {[object]} List of objects containing Slack channel data
 *   Channel Payload Fields:
 *      - id: string (channel.id)
 *      - name: string (chanel.name)
 *      - isPrivate: bool (channel.is_private)
 *      - desciption: string (channl.topic.value / default)
 * @throw Error from getSkeemaMetadataWithSkeemaID or users.conversations
 */
async function getChannels(db, sid) {
    try {
        let metadata;
        metadata = await getSkeemaMetadataWithSkeemaID(db, sid);

        const client = new WebClient(metadata.slackToken); // slack API client

        const slackChannels = await client.users.conversations({
            user: metadata.slackUID, // ! Slack API does not guarantee consistency here
            // types: "public_channel,private_channel,im,mpim",
            types: "public_channel,private_channel",
        });

        const channels = slackChannels.channels.map((channel) => {
            const description =
                channel.topic.value == ""
                    ? DEFAULT_DESCRIPTION
                    : channel.topic.value;
            const channelPayload = {
                id: channel.id, // ! DO NOT store this, because it might change
                name: channel.name,
                isPrivate: channel.is_private,
                // isPersonal: channel.is_im,
                description,
            };
            return channelPayload;
        });

        return channels;
    } catch (err) {
        throw err; // raise to caller
    }
}

module.exports.getChannels = getChannels;
