const { WebClient } = require("@slack/web-api");
const {
    compareObjectsMidStringWithPriority,
} = require("../midStringInterface");

const {
    getSkeemaMetadataWithSkeemaID,
} = require("../firebase/getSkeemaMetadata");

/**
 * Every Slack message is made up of text, but Slack splits it up into blocks
 * or objects that we can search through to find links easily.
 *
 * @param {string} title of bookmark (guaranteed to be valid)
 * @param {string} link / url of bookmark (not guaranteed to be valid)
 * @param {string} favicon link of bookmark (not guaranteed to be valid)
 * @param {string} notes of bookmark, may be empty
 * @returns {object} contains a string list of urls and the message text
 */
function createBookmarkBlock(title, link, favicon, notes) {
    if (!notes) {
        notes = "";
    }

    let elements = [];

    if (favicon) {
        elements.push({
            type: "image",
            image_url: favicon,
            alt_text: "favicon",
        });
    }

    const titleBlock = link
        ? {
              type: "mrkdwn",
              text: `<${link}|${title}>`,
          }
        : {
              type: "mrkdwn",
              text: `${title}>`,
          };
    elements.push(titleBlock);

    return [
        {
            type: "context",
            elements,
        },
    ];
}

/**
 * Given Slack-formatted blocks, post message directly to Slack server
 */
async function sendMessage(client, channelOrUser, blocks, isChannel) {
    try {
        let message;
        if (isChannel) {
            message = {
                channel: channelOrUser.id,
                text: "Message from Skeema",
                unfurl_links: false,
                unfurl_media: false,
                blocks,
            };
        } else {
            const conversation = await client.conversations.open({
                users: `${channelOrUser.uid}`,
                return_im: true,
            });
            message = {
                channel: conversation.channel.id,
                text: "Message from Skeema",
                unfurl_links: false,
                unfurl_media: false,
                blocks,
            };
        }
        await client.chat.postMessage(message);
    } catch (err) {
        throw err;
    }
}

/**
 * Creates and sends a single bookmark to Slack
 */
async function sendSingleBookmark(client, payload, channelOrUser, isChannel) {
    const bookmark = payload.parent;
    const title = bookmark.title;
    const link = bookmark.url;
    const favicon = bookmark.favIconUrl;
    const notes = bookmark.notes;
    const blocks = createBookmarkBlock(title, link, favicon, notes);
    try {
        await sendMessage(client, channelOrUser, blocks, isChannel);
    } catch (err) {
        throw err;
    }
}

/**
 * Creates and sends a tab group to Slack
 */
async function sendTabGroup(client, payload, channelOrUser, isChannel) {
    let startingBlocks = [];
    if (payload.parent.notes) {
        startingBlocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `${payload.parent.title}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `_${payload.parent.notes}_`,
                },
            },
            {
                type: "divider",
            },
        ];
    } else {
        startingBlocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `${payload.parent.title}`,
                },
            },
            {
                type: "divider",
            },
        ];
    }

    let children = payload.children;
    children.sort(compareObjectsMidStringWithPriority);

    let blocks = await Promise.all(
        children.map(async (child) => {
            const link = child.url;
            const favicon = child.favIconUrl;
            const title = child.title;
            const notes = child.notes;
            return createBookmarkBlock(title, link, favicon, notes);
        })
    );
    blocks = blocks.flat();
    blocks = startingBlocks.concat(blocks);
    blocks.push({ type: "divider" });

    try {
        await sendMessage(client, channelOrUser, blocks, isChannel);
    } catch (err) {
        throw err;
    }
}

/**
 * Given a single bookmrk of tab group (bookmark with children), send directly
 * to Slack, formatted according to createBookmarkBlock.
 * All information about what to send and who to send it to is encoded in the
 * payload object.
 *
 * @async Firebase query and Slack API
 * @param {object} db Firestore database
 * @param {object} payload containing important data
 *   payload fields:
 *      - parent: string (bookmark id)
 *      - children: [string] (list of children bookmakr ids)
 *      - channels: [object] (list of channels to send to)
 *      - dms: [object] (list of users in the Slack server)
 * @throw Error from getSkeemaMetadata
 * @throw Error from sendBookmarks functions
 */
async function sendSlackMessage(db, payload) {
    try {
        let metadata;
        metadata = await getSkeemaMetadataWithSkeemaID(db, payload.skeemaUID);

        const client = new WebClient(metadata.slackToken); // slack API client

        if (payload.children.length === 0) {
            await Promise.all(
                payload.channels.map((channel) => {
                    sendSingleBookmark(client, payload, channel, true);
                })
            );
            await Promise.all(
                payload.dms.map((user) => {
                    sendSingleBookmark(client, payload, user, false);
                })
            );
        } else {
            await Promise.all(
                payload.channels.map((channel) => {
                    sendTabGroup(client, payload, channel, true);
                })
            );
            await Promise.all(
                payload.dms.map((user) => {
                    sendTabGroup(client, payload, user, false);
                })
            );
        }
    } catch (err) {
        throw err; // raise to caller
    }
}

module.exports.sendSlackMessage = sendSlackMessage;

/*
    Original message formatting:

    return [
        // {
        //     type: "divider",
        // },
        {
            type: "context",
            elements: [
                {
                    type: "image",
                    image_url: favicon,
                    alt_text: "favicon",
                },
                {
                    type: "mrkdwn",
                    // text: `<${link}|${link.slice(0, LENGTH_SHORT_URL)}...>`,
                    text: `<${link}|${title}>`,
                },
            ],
        },
        // {
        //     type: "section",
        //     text: {
        //         type: "mrkdwn",
        //         text: `${notes}`,
        //     },
        //     accessory: {
        //         type: "image",
        //         image_url: smsURL,
        //         alt_text: "Social Media Preview",
        //     },
        // },
    ];

    Original message sent:
        const sendTabGroup = async (channel) => {
        let startingBlocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `${payload.parent.title}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `_${payload.parent.notes}_`,
                },
            },
            {
                type: "divider",
            },
        ];
        let blocks = await Promise.all(
            payload.children.map(async (child) => {
                const link = child.url;
                const favicon = child.favIconUrl;
                const title = child.title;
                const notes = child.notes;
                // const metadata = await getMetaData(link);
                // const smsURL =
                //     "image" in metadata && metadata.image
                //         ? metadata.image
                //         : favicon;
                return createBookmarkBlock(
                    title,
                    link,
                    favicon,
                    notes
                    // smsURL
                );
            })
        );
        blocks = blocks.flat();
        blocks = startingBlocks.concat(blocks);
        blocks.push({ type: "divider" });

        const message = {
            channel: channel.id,
            text: "Hello World",
            unfurl_links: false,
            unfurl_media: false,
            blocks,
        };
        return client.chat.postMessage(message);
    };

 */
