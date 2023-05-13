const functions = require("firebase-functions");

const {
    getSkeemaMetadataWithSlackID,
} = require("../lib/firebase/getSkeemaMetadata");
const {
    retrieveSlackMessage,
} = require("../lib/slackFunctions/retrieveSlackMessage");
const {
    parseSlackMessage,
} = require("../lib/slackFunctions/parseSlackMessage");
const { getMetadataFromLink } = require("../lib/getMetadataFromLink");
const {
    appendFront,
    compareObjectsMidString,
} = require("../lib/midStringInterface");

const {
    COLLECTION_NAME,
    USER_METADATA_COLLECTION,
    PROJECT_COLLECTION_NAME,
    SKEEMA_VERSION,
} = require("../lib/firebase/firebaseConstants");

const COLOR_VALS = [
    "#504DFF",
    "#0AC1B8",
    "#FD9038",
    "#05825D",
    "#C60F99",
    "#FF7660",
    "#006FB9",
    "#9D9FAC",
    "#B5CAFE",
    "#009AFF",
    "#009AFF",
    "#897B70",
    "#EF0042",
    "#1AA86B",
    "#04C7FF",
    "#FCE100",
    "#B7090C",
    "#E4A408",
    "#6CCB5F",
    "#E2C40E",
    "#A37AFA",
    "#8A4CFF",
    "#FF99A4",
    "#FDBE91",
    "#514CFF",
];

const MAX_MESSAGE_LENGTH = 500; // messages are limited to 500 characters

/**
 * Callback for when a user reacts to a message on Slack.
 *
 * @async Slack API query and Firebase query + write
 * @param {object} event
 * @param {object} client
 * @param {object} db
 */
async function reactionAdded(event, client, db) {
    try {
        //**********************************************************************
        //****************** Extract information from Slack API ****************
        //**********************************************************************

        // For now we only accept skeema emote
        if (event.reaction !== "skeema") return;

        const channelID = event.item.channel;
        const timestamp = event.item.ts;

        const skeemaMetadata = await getSkeemaMetadataWithSlackID(
            db,
            event.user
        );

        const { messageInfo, channelName } = await retrieveSlackMessage(
            db,
            client,
            skeemaMetadata.user,
            channelID,
            timestamp
        );

        const { links, text } = parseSlackMessage(messageInfo);
        if (links.length == 0) return;
        const numLinks = links.length;
        const trimmedText = text.substring(0, MAX_MESSAGE_LENGTH);

        // * This will make HTTP requests to all links for website metadata
        const websites = await Promise.all(links.map(getMetadataFromLink));

        //**********************************************************************
        //************************** Setup for Firestore ***********************
        //**********************************************************************

        const slackUID = event.user;
        const snapshot = await db
            .collection(USER_METADATA_COLLECTION)
            .where("slackUID", "==", slackUID)
            .get();

        let uid;
        if (snapshot.docs.length > 0) {
            uid = snapshot.docs[0].data()["user"];
        } else {
            throw new Error("Snapshot length < 1??"); // ? what
        }

        const projectSnapshot = await db
            .collection(PROJECT_COLLECTION_NAME)
            .where("name", "==", channelName)
            .where("owner", "==", uid)
            .where("trashed", "==", false)
            .get();

        let categoryID;
        if (projectSnapshot.docs.length > 0) {
            categoryID = projectSnapshot.docs[0].data().id;
        } else {
            categoryID = await db.collection(PROJECT_COLLECTION_NAME).doc().id;
            const payload = {
                id: categoryID,
                owner: uid,
                collaborators: [uid],
                name: channelName,
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                trashed: false,
                clonedId: false,
                readShared: false,
                writeShared: false,
                color: COLOR_VALS[
                    Math.floor(Math.random() * COLOR_VALS.length)
                ],
                createdVersion: SKEEMA_VERSION,
                lastVersion: SKEEMA_VERSION,
            };
            await db
                .collection(PROJECT_COLLECTION_NAME)
                .doc(categoryID)
                .set(payload);
        }

        //**********************************************************************
        //********************** Ensure no duplicate data **********************
        //**********************************************************************

        let dataCount = 0;
        await db
            .collection(COLLECTION_NAME)
            .where("category", "==", categoryID)
            .where("notes", "==", trimmedText)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((_) => {
                    dataCount += 1;
                });
            });
        if (dataCount > 0) {
            // ? Figure out what to do if there is already duplicate data
            return;
            // If the check passes above, then this is a new message and we can
            // fill with new entries. Note that it is okay for duplicate links
            // to appear, we only care about duplicate messages.
        }

        //**********************************************************************
        //*************************** Order correctly **************************
        //**********************************************************************

        let docs = [];
        await db
            .collection(COLLECTION_NAME)
            .where("category", "==", categoryID)
            // .orderBy("order", "asc") // TODO Optimize ordering
            // .limit(2)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    docs.push([doc.id, doc.data()]);
                });
            });

        let orders, newOrders;
        if (docs.length == 0) {
            // There are no docs previously so nothing to update
            newOrders = appendFront(numLinks, []);
        } else {
            // If there are already documents in firebase, then we need to
            // update the original highest-order document with a new order.
            // We do so by finding enough midStrings between the previous
            // highest-order and second-highest order, and then give the new
            // strings those orders and change the previous highest-order.

            // find the previous highest-order
            docs.sort((doc1, doc2) =>
                compareObjectsMidString(doc1[1], doc2[1])
            );
            const prevFirstID = docs[0][0];
            let prevFirstDoc = docs[0][1];
            orders = docs.map((doc) => doc[1].order);
            newOrders = appendFront(numLinks, orders);

            // reassign highest-order
            prevFirstDoc.order = newOrders[numLinks];
            db.collection(COLLECTION_NAME) // update in firebase
                .doc(prevFirstID)
                .set(prevFirstDoc)
                .then(() => {});
        }

        const orderedWebsites = websites.map((website, index) => {
            website.order = newOrders[index]; // insert orders into payload
            return website;
        });

        //**********************************************************************
        //************************** Send to Firebase **************************
        //**********************************************************************

        const sendWebsite = async (website) => {
            const docID = await db.collection(COLLECTION_NAME).doc().id;
            const payload = {
                id: docID,
                owner: uid,
                collaborators: [uid],
                createdAt: Date.now(),
                favIconUrl: website.favicon,
                title: website.title,
                url: website.url,
                order: website.order,
                notes: trimmedText, // limit amount stored
                category: categoryID,
                lastUpdated: Date.now(),

                createdVersion: SKEEMA_VERSION,
                lastVersion: SKEEMA_VERSION,
                titleOverride: null,
                trashed: false,
                archived: false,
                snoozed: false,
                expireAt: null,
                status: 0,
                urgency: 300, // ? hard coded?
                manuallyCreated: false,
                forceBubbleUp: false,
                waitingForRename: false,
                ancestorTrashed: false,
                ancestorArchived: false,
                ancestorSnoozed: false,
                didClientChangeCategory: false,
                parent: false,
                clonedId: false,
            };
            await db.collection(COLLECTION_NAME).doc(docID).set(payload);
        };
        await Promise.all(orderedWebsites.map(sendWebsite));
    } catch (err) {
        functions.logger.error(`Error occured resulting from reaction: ${err}`);
        throw err;
    }
}

module.exports.reactionAdded = reactionAdded;
