/**
 * https://api.slack.com/legacy/oauth
 * https://api.slack.com/docs/slack-button
 *
 * This is a legacy protocol according to Slack, mainly because we are using
 * actual user auth tokens instead of bot tokens.
 */

const request = require("request"); // ! Deprecated, in the future use Axios
const functions = require("firebase-functions");

const { USER_METADATA_COLLECTION } = require("../firebase/firebaseConstants");

const redirectURL =
    "https://skeema.notion.site/Skeema-Tips-69bdc97f41e5408b9ad2ec80cf43d648";

/**
 * Callback function for when Skeema requests to handshake with
 * a user's Slack account. The user agrees to to the handshake by giving
 * Skeema their OAuth xoxp user auth Slack token.
 *
 * @param {object} db Firestore database
 * @param {object} config Firebase function config
 * @param {object} req Express request
 * @param {object} res Express response
 */
function skeemaSlackHandshake(db, config, req, res) {
    if (!req.query.code) {
        const errorMessage = "No temporary Slack auth grant code was provided";
        functions.logger.error(errorMessage);
        res.status(500).send(errorMessage);
    }

    // console.log("temp authorization code", req.query.code);
    // console.log("skeema uid", req.query.state);
    const skeemaUID = req.query.state;

    const data = {
        form: {
            client_id: config.slack.client_id,
            client_secret: config.slack.client_secret,
            code: req.query.code,
        },
    };

    // When we post to the Slack API, it will send back a json containing
    // at minimum a xoxb access token and hopefully a slack UID.
    const postCallback = (error, response, body) => {
        try {
            if (!error && response.statusCode == 200) {
                const responseObject = JSON.parse(body);

                if (!("authed_user" in responseObject)) {
                    const grantError =
                        "No authentication grant in response body";
                    functions.logger.error(grantError);
                    res.status(400).send(grantError);
                    return;
                }

                // Retrieve xoxp auth token and slackUID
                const accessToken = responseObject.authed_user.access_token;
                const slackUID = responseObject.authed_user.id;

                db.collection(USER_METADATA_COLLECTION)
                    .where("user", "==", skeemaUID)
                    .get()
                    .then((snapshots) => {
                        // ? Why is this a list of snapshots?
                        if (snapshots.size > 0) {
                            snapshots.forEach((doc) => {
                                db.collection(USER_METADATA_COLLECTION)
                                    .doc(doc.id)
                                    .update({
                                        slackUID: slackUID,
                                        slackToken: accessToken,
                                    });
                            });
                        }
                    });

                // Show a nicer web page or redirect to Slack,
                // instead of just giving 200 in reality!
                res.redirect(redirectURL);
            } else {
                const errorMessage =
                    "Something went wrong with the handshake with Slack: ";
                functions.logger.error("Request post error:", errorMessage);
                res.status(response.statusCode).send(errorMessage + error);
            }
        } catch (err) {
            functions.logger.error("postCallback error:", err);
            res.status(500).send(err);
        }
    };

    request.post("https://slack.com/api/oauth.v2.access", data, postCallback);
}

module.exports.skeemaSlackHandshake = skeemaSlackHandshake;
