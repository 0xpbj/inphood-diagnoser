let dotEnv = require('dotenv').config({path: './.env-production'})

var botBuilder = require('claudia-bot-builder'),
    excuse = require('huh');

const firebase = require('firebase')
if (firebase.apps.length === 0) {
  firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
}

module.exports = botBuilder(function (request) {

  return 'Thanks for sending ' + request.text  +
      '. Your message is very important to us, but ' +
      excuse.get();
}, { platforms: ['facebook', 'twilio', 'viber', 'telegram', 'kik', 'groupme'] })
