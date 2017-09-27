let dotEnv = require('dotenv').config({path: './.env-production'})

const requestPromise = require('request-promise')
const firebase = require('firebase')

if (firebase.apps.length === 0) {
  console.log('FIREBASE_API_KEY = ' + process.env.FIREBASE_API_KEY)
  firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
}

function diagnosisScript(userId, text) {
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/' + userId)

  return dbUserRef.once("value")
  .then(function(snapshot) {
    if (snapshot.val() === null) {
      return 'User doesn\'t exist'
    }
    return 'User exists'  
  })
}

exports.processMessage = function(userId, text) {
  if (firebase.auth().currentUser) {
    return diagnosisScript(userId, text)
  }

  return firebase.auth().signInAnonymously()
  .then(() => {
    return diagnosisScript(userId, text)
  })
  .catch(error => {
    console.log('Login Error', error)
    return 'I\'m experiencing technical difficulties. ' +
           'Please come back soon.'
  })
}
