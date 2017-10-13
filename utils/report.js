// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../bot/.env-production'})

const constants = require('./../bot/constants.js')

const finalState = constants.finalState

const requestPromise = require('request-promise')
const firebase = require('firebase')

function reportService(serviceName, serviceStats) {
  console.log(serviceName)
  console.log('- - - - - - - - - - - - - - - ')
  console.log(serviceName + ' users    = ' + serviceStats.count)
  console.log(serviceName + ' at risk  = ' + serviceStats.atRisk)
  console.log(serviceName + ' finished = ' + serviceStats.finished)
}

function report() {
  const cd = new Date()
  console.log()
  console.log('Diagnoser AI User Report ' + cd.toLocaleDateString())
  console.log('----- ----- ----- ----- ----- ----- ----- ----- ----- -----')

  const dbUsersRef = firebase.database().ref('/global/diagnosisai/users')
  return dbUsersRef.once("value")
  .then(function(snapshot) {
    const ssVal = snapshot.val()
    if (ssVal === null) {
      console.log('   Unable to connect to firebase.')
      return
    }

    let twilio = {
      count: 0,
      atRisk: 0,
      finished: 0
    }
    let telegram = {
      count: 0,
      atRisk: 0,
      finished: 0
    }
    let facebook = {
      count: 0,
      atRisk: 0,
      finished: 0
    }

    for (let userId in ssVal) {
      const userData = ssVal[userId]
      switch (userData.client) {
        case 'twilio':
          twilio.count++
          if (userData.score >= 5) {
            twilio.atRisk++
            console.log('   clinicFinder: ' + userData.clinicFinder)
          }
          if (userData.nextState === finalState) {
            twilio.finished++
          }
          // console.log('   nextState='+userData.nextState)
          break;
        case 'telegram':
          telegram.count++
          if (userData.score >= 5) {
            telegram.atRisk++
            console.log('   clinicFinder: ' + userData.clinicFinder)
          }
          if (userData.nextState === finalState) {
            telegram.finished++
          }
          // console.log('   nextState='+userData.nextState)
          break;
        case 'facebook':
          facebook.count++
          if (userData.score >= 5) {
            facebook.atRisk++
            console.log('   clinicFinder: ' + userData.clinicFinder)
          }
          if (userData.nextState === finalState) {
            facebook.finished++
          }
          // console.log('   nextState='+userData.nextState)
          break;
        default:
          // console.log('   Unexpected client found')
          // console.log('   userId:' + userId)
          // console.log('   userData:\n' + userData)
      }
    }

    console.log('')
    const totalCount = twilio.count + telegram.count + facebook.count
    const totalAtRisk = twilio.atRisk + telegram.atRisk + facebook.atRisk
    const totalFinished = twilio.finished + telegram.finished + facebook.finished
    console.log('Totals')
    console.log('- - - - - - - - - - - - - - - ')
    console.log('Total users    = ' + totalCount)
    console.log('Total at risk  = ' + totalAtRisk)
    console.log('Total finished = ' + totalFinished)
    console.log('')
    reportService('Twilio', twilio)
    console.log('')
    reportService('Telegram', telegram)
    console.log('')
    reportService('Facebook', facebook)
    console.log('')
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
    return report()
  } else {
    return firebase.auth().signInAnonymously()
    .then(() => {
      return report()
    })
  }
}

main()
return
