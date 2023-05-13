# **Skeema and Slack: Setup Pipeline**


## **Frontend: Grain**

---

_Grain is the repository for the entire frontend. It is a Chrome extension that uses React.js. Build and host it locally using Node.js version 12 and webpack._

</br>

### **Building and loading Skeema Frontend**

To build the extension, type the following commands:

```
cd ~/Grain/extension
nvm use 12
yarn install
yarn watch
```

`yarn watch` will monitor changes and push the changes to the built folder, which is then updated in chrome. **Make sure to keep the terminal open** to allow dynamic updates.

After building, open Chrome and go to the [extension settings](chrome://extensions/). **Make sure to toggle developer mode.**

Click `load unpacked` at the top left corner of the extension settings page. It will ask for a folder directory. Direct it to the root directory and select this folder:
`~/Grain/extension/built`. **Make sure to turn on the extension if it isn't already.**

Go to Chrome and open a new tab. If everything is working properly, it should open a new default skeema tab.

</br>

### **Adding Slack to Skeema**

Go to the settings button at the bottom left of the Skeema page. Press the `Add to Slack` button. This button will attempt to get the user's Slack OAuth Token. If we are running locally, we can hard code the `redirectURL`.

To hard code the `redirectURL`, go to Settings.tsx in `~/Grain/extension/src/js/components/ToDos/Settings.tsx`.
Note that in VSCode, you can just search using command palette.

First, find `isLocal` and set it to `true`. Then, find the `redirectURL`. These are both around lines `40-55`. _We will need to change this url soon._

</br>
</br>

## **Backend: Hosting the Cloud Function**

---

_The Server is just a serverless firebase cloud function that is constantly listening to Slack using Slack's API._

</br>

### **Run the Firebase Cloud function**

Go to the skeema-slack-server repository. Note that this is running in Node.js version 14.

**_Follow the `~/skeema-slack-server/README.md` to get the cloud function running locally._**
As a rundown, if you are doing this for the first time you need to set up the firebase functions settings:
```
nvm use 14
npm install
firebase login
firebase functions:config:set slack.signing_secret=278a45587a4d5005c7eeed9c0510e158 --project api-project-826630658209
firebase functions:config:set slack.client_id=10585065921.4396970429604 --project api-project-826630658209
firebase functions:config:set slack.client_secret=faa47c0c978bbd359f2aa96a0a9bd170 --project api-project-826630658209
firebase functions:config:set slack.bot_token=xoxb-10585065921-4388009764294-WNkKvXDYQD3rcg4HHelW4v7Z --project api-project-826630658209
```

But if you have already done that, all you should really need to do is the following:
```
cd functions
nvm use 14
firebase serve -p 5001
```

</br>

### **Forward using ngrok**

Once the cloud function is running locally, we then need to forward it over the internet. We use `ngrok` for this.

Start ngrok forwarding on port 5001, or whatever port the cloud function is running on.

```
ngrok http 5001
```

Copy the forwarding address on the ngrok terminal.
It will look something like: `https://1234-567-890-abcdef.ngrok.io/`

</br>

### **Edit Slack API redirect URLs**

We need to update 3 URLs. 1 locally in the aforementioned Settings.tsx, and then 2 on the Slack API website: 1 for the redirect URL and 1 for listening to events.

Go to the Slack API website and navigate to [OAuth & Permissions](https://api.slack.com/apps/A04BNUJCMHS/oauth) and change the redirect URL to something like `https://1234-567-890-abcdef.ngrok.io/api-project-826630658209/us-central1/slack/auth`, except replace the prefix with whatever ngrok forwarding url you are using. **Make sure to save the url.**

Then go to [Event Subscriptions](https://api.slack.com/apps/A04BNUJCMHS/event-subscriptions). Change the Request URL to `https://1234-567-890-abcdef.ngrok.io/api-project-826630658209/us-central1/slack/events` or similar. **Make sure to turn on the `Enable Events`**.

To repeat: **Make sure you save all of your changes**

Finally, go to `~/Grain/extension/src/js/components/ToDos/Settings.tsx` again and make sure to set `redirectURL` to `https://1234-567-890-abcdef.ngrok.io/api-project-826630658209/us-central1/slack/auth`. If you closed your `yarn watch` terminal, you will have to build it again.

</br>

---
---

</br>

Now everything _should_ be set up.

Go back to settings in the Skeema tab on Chrome and hit `Add to Slack`. A new page will pop up, make sure to hit `Allow All`. On the `ngrok` prompt, hit `Visit Site`.

Go to Slack, and specificaly the channel `#skeema-design`. React to a message with links with the Skeema emote. If everything is working properly, new links should pop up in the `skeema-design` group.
