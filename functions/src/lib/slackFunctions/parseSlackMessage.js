/**
 * Every Slack message is made up of text, but Slack splits it up into blocks
 * or objects that we can search through to find links easily.
 *
 * @param {object} meessageInfo
 * @returns {object} contains a string list of urls and the message text
 * TODO see comments, this is not a well defined function yet
 */
function parseSlackMessage(messageInfo) {
    let text = "";
    let links = [];
    try {
        if ("blocks" in messageInfo) {
            messageInfo.blocks.forEach((block) => {
                if (block.type == "rich_text") {
                    console.assert("elements" in block);
                    block.elements.forEach((elementSection) => {
                        elementSection.elements.forEach((element) => {
                            if (
                                "type" in element &&
                                "url" in element &&
                                element.type == "link"
                            ) {
                                links.push(element.url);
                                if ("text" in element) {
                                    text += element.text;
                                } else {
                                    text += element.url;
                                }
                            } else if ("text" in element) {
                                text += element.text;
                            }
                        });
                    });
                    // TODO parse markdown for any links (Hard)
                } else if (block.type == "header") {
                    console.assert("text" in block);
                    if ("text" in block.text) {
                        text += block.text.text;
                    }
                } else if (block.type == "section") {
                    console.assert("text" in block);
                    if ("text" in block.text) {
                        text += block.text.text;
                    }
                } else if (block.type == "context") {
                    // TODO
                }
            });
            return { links, text };
        } else {
            console.error("No blocks:", messageInfo);
            return { links, text: messageInfo.text };
        }
    } catch (err) {
        throw err;
    }
}

module.exports.parseSlackMessage = parseSlackMessage;
