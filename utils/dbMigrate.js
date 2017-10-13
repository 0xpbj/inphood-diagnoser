// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../bot/.env-production'})
const cryptoUtils = require('./../bot/cryptoUtils.js')

const requestPromise = require('request-promise')
const firebase = require('firebase')

// Check if a key for use in Firebase is legal (i.e. doesn't contain illegal
// characters).
// From: https://stackoverflow.com/questions/20363052/cant-post-data-containing-in-a-key-to-firebase/20363114#20363114
//
function isKeyLegalFbase(key) {
  return (key.search(/[\.\$\[\]\#\/]/i) === -1)
}

// Quick and dirty object comparison (Not perfect, misses functions for instance).
// From: https://stackoverflow.com/questions/1068834/object-comparison-in-javascript
//
function sameObjsQAndD(obj1, obj2) {
  return (JSON.stringify(obj1) === JSON.stringify(obj2))
}

function migrate() {
  const cd = new Date()
  console.log()
  console.log('Migrating DB data to encrypted DB:' + cd.toLocaleDateString())
  console.log('----- ----- ----- ----- ----- ----- ----- ----- ----- -----')
  const dbUsersRef = firebase.database().ref('/global/diagnosisai/users')

  const edbRef = firebase.database().ref('/global/dai/u')

  return dbUsersRef.once("value")
  .then(function(snapshot) {
    const ssVal = snapshot.val()
    if (ssVal === null) {
      console.log('   Unable to connect to firebase.')
      return
    }

    for (let userId in ssVal) {
      // Encrypt userId and Object:
      //
      const eUserId = cryptoUtils.encryptStr(userId)

      const userObj = ssVal[userId]
      const eUserObj = cryptoUtils.encryptObj(userObj)

      // Check to make sure values decrypt properly:
      //
      const dEUserId = cryptoUtils.decryptStr(eUserId)
      if (dEUserId !== userId || !isKeyLegalFbase(eUserId)) {
        console.log('ERROR ERROR ERROR')
      }

      const dEUserObj = cryptoUtils.decryptObj(eUserObj)
      if (!sameObjsQAndD(userObj, dEUserObj)) {
        console.log('ERROR ERROR ERROR - userObj / dEUserObj:')
        console.log('----------------------------------------')
        console.log(userObj)
        console.log('-----')
        console.log(dEUserObj)
        console.log('')
      }

      // Store the encrypted values in the new database:
      // (Over-writes existing values)
      const eUserRef = edbRef.child(eUserId)
      eUserRef.set(eUserObj)
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
    return migrate()
  } else {
    return firebase.auth().signInAnonymously()
    .then(() => {
      return migrate()
    })
  }
}

main()
return
