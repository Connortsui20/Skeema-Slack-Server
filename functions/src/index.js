//*****************************************************************************/
//******************************** Imports ************************************/
//*****************************************************************************/

const { App, ExpressReceiver } = require("@slack/bolt");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const config = functions.config();
const serviceAccountProd = require("../secrets/firebase-admin-todos-c6257.json");
const serviceAccountDev = require("../secrets/firebase-admin-todos---test.json");

const { reactionAdded } = require("./events/reactionAdded");
const { getChannels } = require("./lib/slackFunctions/getChannels");
const { getUsers } = require("./lib/slackFunctions/getUsers");
const {
    skeemaSlackHandshake,
} = require("./lib/slackFunctions/skeemaSlackHandshake");
const { sendSlackMessage } = require("./lib/slackFunctions/sendSlackMessage");

//*****************************************************************************/
//********************************* Setup *************************************/
//*****************************************************************************/

const expressReceiver = new ExpressReceiver({
    signingSecret: config.slack.signing_secret,
    endpoints: "/events",
    processBeforeResponse: true,
});

const app = new App({
    receiver: expressReceiver,
    token: config.slack.bot_token,
    processBeforeResponse: true,
});
app.error(console.error); // redirect to console

const appExpress = expressReceiver.app;

const IS_DEVELOPMENT_MODE = true;

admin.initializeApp({
    credential: admin.credential.cert(
        IS_DEVELOPMENT_MODE ? serviceAccountDev : serviceAccountProd
    ),
    databaseURL: `https://${
        IS_DEVELOPMENT_MODE ? "todos---test" : "todos-c6257"
    }.firebaseio.com`,
});

const db = admin.firestore();

//*****************************************************************************/
//****************************** Event Listeners ******************************/
//*****************************************************************************/

// On reaction added in any channel the Skeema bot is in
app.event("reaction_added", async ({ event, client }) =>
    reactionAdded(event, client, db)
);

//*****************************************************************************/
//******************************** HTTP Paths *********************************/
//*****************************************************************************/

// ! Security, anyone can get request this
// Retrieves user channels given a Skeema ID
appExpress.get("/get-channels/:sid", async (req, res) => {
    const skeemaUID = req.params.sid; // Skeema UID
    try {
        const channels = await getChannels(db, skeemaUID);
        res.status(200).send(channels);
    } catch (err) {
        // ideally replae with pattern matching
        if (err.message === "Auth Error") {
            res.status(401).send("No Slack Authenticaton Token Found");
        } else {
            console.log(err);
            res.status(500).send("Error getting user channels: " + err);
        }
    }
});

// ! Security, anyone can get request this
// Retrieves all users in a user's server given a Skeema ID
appExpress.get("/get-users/:sid", async (req, res) => {
    const skeemaUID = req.params.sid; // Skeema UID
    try {
        const users = await getUsers(db, skeemaUID);
        res.status(200).send(users);
    } catch (err) {
        if (err.message === "Auth Error") {
            res.status(401).send("No Slack Authenticaton Token Found");
        } else {
            res.status(500).send("Error getting server users: " + err);
        }
    }
});

// Facilitates the handshake between Skeema and Slack
// User gives their xoxp token that allows Skeema to do things on their behalf
appExpress.get("/auth", (req, res) => {
    skeemaSlackHandshake(db, config, req, res);
});

// Skeema sends a bookmark or a group of bookmarks to Slack
appExpress.post("/send-slack", async (req, res) => {
    try {
        await sendSlackMessage(db, req.body);
        res.status(200).send("message sent, nothing to do now");
    } catch (err) {
        if (err.message === "Auth Error") {
            res.status(401).send("No Slack Authenticaton Token Found");
        } else {
            res.status(500).send("Duplicate Slack User IDs found:" + err);
        }
    }
});

exports.slack = functions.https.onRequest(expressReceiver.app);
