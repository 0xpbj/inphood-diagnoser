// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../bot/.env-production'})

const constants = require('./../bot/constants.js')

const requestPromise = require('request-promise')
const firebase = require('firebase')

// Update the nextState from 10 to finalState for existing customers. (prior to
// pushing the integration to the locator service)
//
function updateLastState() {
  const cd = new Date()
  console.log()
  console.log('Updating nextState from 10 to finalState - ' + cd.toLocaleDateString())
  console.log('----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----')
  const dbUsersRef = firebase.database().ref('/global/diagnosisai/users')

  return dbUsersRef.once("value")
  .then(function(snapshot) {
    const ssVal = snapshot.val()
    if (ssVal === null) {
      console.log('   Unable to connect to firebase.')
      return
    }

    for (let userId in ssVal) {
      let userObj = ssVal[userId]
      if (userObj.nextState === 10) {
        console.log('  Updating ' + userId + ' nextState from 10 to ' + constants.finalState)
        // if (userId == 7) { // Restrict to our terminal account for testing
          // console.log('  Actually trying on userId:' + userId)
          const userNextStateRef = dbUsersRef.child(userId + '/' + 'nextState')
          userNextStateRef.set(constants.finalState)
        // }
      }
    }
  })
}

function main() {
  if (firebase.apps.length === 0) {
    firebase.initializeApp({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    })
  }

  if (firebase.auth().currentUser) {
    return updateLastState()
  } else {
    return firebase.auth().signInAnonymously()
    .then(() => {
      return updateLastState()
    })
  }
}

main()
return
