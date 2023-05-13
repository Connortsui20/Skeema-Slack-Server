const getChannels = require("./getChannels").getChannels;

/**
 * Returns the message object and the channel name by querying Slack.
 *
 * @aysnc Slack API query
 * @param {object} client
 * @param {string} channelID
 * @param {string} timestamp
 * @returns {object} contains messageInfo object and channelName
 */
async function retrieveSlackMessage(
    db,
    client,
    skeemaUID,
    channelId,
    timestamp
) {
    let channels = await getChannels(db, skeemaUID);
    channels = channels.filter((channel) => channel.id === channelId);
    channelName = channels.length > 0 ? channels[0].name : "Unnamed Channel";
    console.assert(
        channels.length == 1,
        "Multiple channels with the same name"
    );

    const messageList = await client.conversations.history({
        channel: channelId,
        latest: timestamp,
        inclusive: true, // Limit results
        limit: 1,
    });

    if (messageList.messages.length > 1) {
        console.error(
            "Too many messaeges, number of messages is:",
            messageList.messages.length
        );
    }

    const messageInfo =
        messageList.messages.length > 0
            ? messageList.messages[0] // get the first one
            : "Unknown Message";

    return {
        messageInfo,
        channelName,
    };
}

module.exports.retrieveSlackMessage = retrieveSlackMessage;
