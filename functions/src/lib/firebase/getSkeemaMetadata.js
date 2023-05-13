const { USER_METADATA_COLLECTION } = require("./firebaseConstants");

/**
 * Refer to wrapper functions getSkeemaMetadataWith___ID
 */
async function getSkeemaMetadata(db, id, isSkeemaID) {
    try {
        const query = isSkeemaID ? "user" : "slackUID";
        let userMetadata;
        await db
            .collection(USER_METADATA_COLLECTION)
            .where(query, "==", id)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.size == 0) {
                    throw new Error("Auth Error");
                } else if (querySnapshot.size != 1) {
                    throw new Error("Fatal: Firebase Error");
                } else {
                    console.assert(querySnapshot.size == 1);
                    // should only run once
                    querySnapshot.forEach((doc) => {
                        userMetadata = doc.data();
                    });
                }
            });
        return userMetadata;
    } catch (err) {
        throw err; // raise to caller
    }
}

/**
 * Given the the Firestore database and a Skeema user ID, retrieve the metadata
 * document that conatins OAuth xoxp token that the user submitted to Skeema
 * as well as other info like Slack User ID
 *
 * @param {object} db Firestore database
 * @param {string} sid Skeema user ID
 * @returns {object} Skeema Metadata object
 *  Object fields:
 *      - user: string (Skeema UID)
 *      - lastUpdated: timestamp
 *      - createdAt: timestamp
 *      - slackUID: string (Slack UID)
 *      - slackToken: string (Slack xoxp User Auth token)
 */
async function getSkeemaMetadataWithSkeemaID(db, sid) {
    try {
        return await getSkeemaMetadata(db, sid, true);
    } catch (err) {
        throw err; // raise to caller
    }
}

/**
 * Given the the Firestore database and a Slack user ID, retrieve the metadata
 * document that conatins OAuth xoxp token that the user submitted to Skeema
 * as well as other info like Slack User ID
 *
 * @param {object} db Firestore database
 * @param {string} uid Slack user ID
 * @returns {object} Skeema Metadata object
 *  Object fields:
 *      - user: string (Skeema UID)
 *      - lastUpdated: timestamp
 *      - createdAt: timestamp
 *      - slackUID: string (Slack UID)
 *      - slackToken: string (Slack xoxp User Auth token)
 */
async function getSkeemaMetadataWithSlackID(db, uid) {
    try {
        return await getSkeemaMetadata(db, uid, false);
    } catch (err) {
        throw err; // raise to caller
    }
}

module.exports.getSkeemaMetadataWithSkeemaID = getSkeemaMetadataWithSkeemaID;
module.exports.getSkeemaMetadataWithSlackID = getSkeemaMetadataWithSlackID;
