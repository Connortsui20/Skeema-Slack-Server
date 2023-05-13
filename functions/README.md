Skeema Slack Bot Backend.


# Setup

- go to `https://api.slack.com/apps/A04BNUJCMHS`
- In `Basic Information`, get `Signing Secret`, `Client Id`, `Client Secret`
- In `OAuth & Permissions`, get `Bot User OAuth Token`
- Need to install Firebase CLI.

## Add events URL and OAuth redirect URL

- go to `https://api.slack.com/apps/A04BNUJCMHS`
- In `Event Subscriptions`, add the request URL you get from ngrok, e.g. `https://929d-67-171-68-143.ngrok.io/api-project-826630658209/us-central1/slack/events`
- In `OAuth & Permissions`, add the redirect url, e.g. `https://929d-67-171-68-143.ngrok.io/api-project-826630658209/us-central1/slack/auth`
- In `Settings.tsx` in Grain-slack, rename `redirectURL` on line 45 to this `https://929d-67-171-68-143.ngrok.io//api-project-826630658209/us-central1/slack/auth`


## Set up firebase functions

If running for the first time:
```
nvm use 14
npm install
firebase login
firebase functions:config:set slack.signing_secret=278a45587a4d5005c7eeed9c0510e158 --project api-project-826630658209
firebase functions:config:set slack.client_id=10585065921.4396970429604 --project api-project-826630658209
firebase functions:config:set slack.client_secret=faa47c0c978bbd359f2aa96a0a9bd170 --project api-project-826630658209
firebase functions:config:set slack.bot_token=xoxb-10585065921-4388009764294-WNkKvXDYQD3rcg4HHelW4v7Z --project api-project-826630658209
```

Finally, start backend cloud function:
```
nvm use 14
cd functions
firebase serve -p 5001
```
To test if it is working, go to the url given
(will look like http://localhost:5001/api-project-826630658209/us-central1/slack)
At the end of the url, add "/test", and you should see "skeema slack bot endpoint"

In a different terminal, start forwarding on ngrok.
```
ngrok http 5001
```



## production

`firebase deploy --only functions`
change events request URL & OAuth redirect url following the above step.
