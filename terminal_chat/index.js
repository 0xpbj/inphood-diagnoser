let dotEnv = require('dotenv').config({path: './../.env-production'})

const prompt = require('prompt')
const firebase = require('firebase')

// TODO:
const mtp = require('../sugarbot/modules/msgTxtProcessor.js')

if (firebase.apps.length === 0) {
  console.log('Initializaing firebase app...')
  firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
  console.log(firebase.apps)
}

if (!firebase.auth().currentUser) {
  return firebase.auth().signInAnonymously()
  .then(() => {
    return initPrompt()
  })
  .catch(error => {
    console.log('Login Error', error)
    return
  })
}



let messageText = undefined
const AC = 0
const BJ = 1
const userId = constants.testUsers[AC]

// If undefined, these will be defined in initPrompt
//
let favorites = undefined
let timezone = undefined
let name = undefined
let tempRef = undefined

function initPrompt() {
  console.log('Getting snapshot for ' + userId + ' from firebase ...')
  tempRef = firebase.database().ref("/global/sugarinfoai/" + userId)
  return tempRef.once("value")
  .then(function(snapshot) {
    console.log('  success.')
    favorites = snapshot.child('/myfoods/').val()
    timezone = snapshot.child('/profile/timezone').val() ? snapshot.child('/profile/timezone').val() : -7
    name = snapshot.child('/profile/first_name').val() ? snapshot.child('/profile/first_name').val() : ""

    prompt.start();
    return letsPrompt()
  })
  .catch(error => {
    console.log('Error accessing firebase. Exiting!')
    return
  })
}

// We've created a recursive while-loop of promises here to simulate a chat session
// using prompt. letsPrompt is called initially and proxies user input to a message text
// processor, simulating our chatbot (to speed up development instead of using Lambda)
//
function handlePrompt(err, result) {
  const timestamp = Date.now()
  const date = timeUtils.getUserDateString(timestamp, timezone)

  messageText = result.sugarinfoAI
  console.log('("exit" to quit) > ' + messageText)
  if (messageText !== 'exit') {
    //
    // Proxy the user's input to our message text processor (that uses Wit etc.)
    //
    const userRef = firebase.database().ref("/global/sugarinfoai/" + userId)
    if (messageText.toLowerCase() === 'd-start7') {
      userRef.child('profile').update({challenge: 'in progress'})
      return 'Challenge in progress.'
    }
    else if (messageText.toLowerCase() === 'd-stop7') {
      userRef.child('profile').update({challenge: 'stopped'})
      return 'Challenge stopped.'
    }
    return mtp.msgTxtProcessor(firebase, messageText, userId,
                        favorites, timezone, name, timestamp, date)
    .then((result) => {
      console.log(result)
      return letsPrompt()
    })
    .catch(error => {
      console.log('msgTxtProcessor: ', error)
      return
    })
  } else {
    return
  }
}

function letsPrompt() {
  return prompt.get(['sugarinfoAI'], (err, result) => handlePrompt(err, result))
}
