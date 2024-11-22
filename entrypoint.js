const axios = require('axios');
const fs = require('fs');
const _ = require('lodash');
const { argv } = require('yargs');

const REQUIRED_ENV_VARS = [
  'GITHUB_EVENT_PATH',
  'GITHUB_REPOSITORY',
  'GITHUB_WORKFLOW',
  'GITHUB_ACTOR',
  'GITHUB_EVENT_NAME',
  'GITHUB_ACTION',
  'DISCORD_WEBHOOK',
  'DISCORD_WEBHOOK_FORUM',
  'ENABLE_FORUM'
];

process.env.GITHUB_ACTION = process.env.GITHUB_ACTION || '<missing GITHUB_ACTION env var>';

REQUIRED_ENV_VARS.forEach(env => {
  if (!process.env[env] || !process.env[env].length) {
    console.error(
      `Env var ${env} is not defined. Maybe try to set it if you are running the script manually.`
    );
    process.exit(1);
  }
});

const eventContent = fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

let url;
let payload;
let postPayload;
let issue_link;
let issue_title;

if (argv._.length === 0 && !process.env.DISCORD_EMBEDS) {
  // If argument and embeds NOT provided, let Discord show the event informations.
  url = `${process.env.DISCORD_WEBHOOK}/github`;
  payload_url = `${process.env.DISCORD_WEBHOOK_FORUM}`;
  payload = JSON.stringify(JSON.parse(eventContent));
  postPayload = JSON.stringify(JSON.parse(eventContent));
} else {
  // Otherwise, if the argument or embeds are provided, let Discord override the message.
  issue_link = argv._.slice(-1)[0] + "#";
  issue_title = argv._.slice(0, -1).join(' ');
  const message = "[ ** "+issue_title+"** ]("+issue_link+")";

  let embedsObject;
  if (process.env.DISCORD_EMBEDS) {
     try {
        embedsObject = JSON.parse(process.env.DISCORD_EMBEDS);
     } catch (parseErr) {
       console.error('Error parsing DISCORD_EMBEDS :' + parseErr);
       process.exit(1);
     }
  }

  //trimming the issue title to 100 characters as more than that is not allowed
  if (issue_title.length > 100) {
    issue_title = `${issue_title.slice(0, 97)}...`
  }

  url = process.env.DISCORD_WEBHOOK;
  payload_url = process.env.DISCORD_WEBHOOK_FORUM;
  payload = JSON.stringify({
    content: message,
    ...process.env.DISCORD_EMBEDS && { embeds: embedsObject },
    ...process.env.DISCORD_USERNAME && { username: process.env.DISCORD_USERNAME },
    ...process.env.DISCORD_AVATAR && { avatar_url: process.env.DISCORD_AVATAR },
  });
  postPayload = JSON.stringify({
    content: issue_link,
    thread_name: issue_title,
    thread_type: 10, // this creates a new thread in a forum channel
   // channel_id: process.env.DISCORD_FORUM_CHANNEL_ID,
    ...process.env.DISCORD_EMBEDS && { embeds: embedsObject },
    ...process.env.DISCORD_USERNAME && { username: process.env.DISCORD_USERNAME },
    ...process.env.DISCORD_AVATAR && { avatar_url: process.env.DISCORD_AVATAR },
  });
  console.log(postPayload);
}

// curl -X POST -H "Content-Type: application/json" --data "$(cat $GITHUB_EVENT_PATH)" $DISCORD_WEBHOOK/github

(async () => {
  console.log("sending ");
  if (process.env.ENABLE_FORUM === "true" ){
    console.log(' post ...');
    await axios.post(
      `${payload_url}?wait=true`,
      postPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': process.env.GITHUB_EVENT_NAME,
        },
      },
    );
      console.log('Post sent ! Shutting down ...');
  }else{
    console.log(' message ...');
    await axios.post(
      `${url}?wait=true`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': process.env.GITHUB_EVENT_NAME,
        },
      },
    );
    console.log('Message sent ! Shutting down ...');
    process.exit(0);
  }
})().catch(err => {
  console.error('Error :', err.response.status, err.response.statusText);
  console.error('Message :', err.response ? err.response.data : err.message);
  process.exit(1);
});

