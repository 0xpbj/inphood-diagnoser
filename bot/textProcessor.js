let dotEnv = require('dotenv').config({path: './.env-production'})

const requestPromise = require('request-promise')
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

const heightWeightLUT = {
  '4\'10"': [119, 142, 143, 190, 191],
  '4\'11"': [124, 147, 148, 197, 198],
  '5\'0"': [128, 152, 153, 203, 204],
  '5\'1"': [132, 157, 158, 210, 211],
  '5\'2"': [136, 163, 164, 217, 218],
  '5\'3"': [141, 168, 169, 224, 225],
  '5\'4"': [145, 173, 174, 231, 232],
  '5\'5"': [150, 179, 180, 239, 240],
  '5\'6"': [155, 185, 186, 246, 247],
  '5\'7"': [159, 190, 191, 254, 255],
  '5\'8"': [164, 196, 197, 261, 262],
  '5\'9"': [169, 202, 203, 269, 270],
  '5\'10"': [174, 208, 209, 277, 278],
  '5\'11"': [179, 214, 215, 285, 286],
  '6\'0"': [184, 220, 221, 293, 294],
  '6\'1"': [189, 226, 227, 301, 302],
  '6\'2"': [194, 232, 233, 310, 311],
  '6\'3"': [200, 239, 240, 318, 319],
  '6\'4"': [205, 245, 246, 327, 328]
}

function getHeightWeightScore(height, weight) {
  if (!height || !weight || !(height in heightWeightLUT)) {
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@ problem height')
    return -1
  }
  let fixQuotesHeight = height.replace('’', '\'')
  fixQuotesHeight = fixQuotesHeight.replace('”', '"')
  console.log('getHeightWeightScore. fixQuotesHeight:' + fixQuotesHeight)
  console.log('  weight:'+weight)

  const boundsArr = heightWeightLUT[fixQuotesHeight]
  if (weight >=  boundsArr[0] && weight <= boundsArr[1]) {
    return 1
  } else if (weight >= boundsArr[2] && weight <= boundsArr[3]) {
    return 2
  } else if (weight >= boundsArr[4]) {
    return 3
  }
  return 0
}

function diagnosisScript(userId, text) {
  console.log('diagnosisScript. userId:'+userId+', text:'+text)
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/' + userId)

  return dbUserRef.once("value")
  .then(function(snapshot) {
    if (snapshot.val() === null) {
      console.log('  state 0 (initializing user in db)')
      //////////////
      // State  0 //
      //////////////
      dbUserRef.update({lastState: 0, nextState: 1, score: 0})
      return 'Hello, I am Diagnoser AI! I can tell if you\'re at risk for ' +
             'prediabetes and connect you to effective help. Your chances ' +
             'of successfully avoiding this condition are excellent!\n\n' +
             'How many years old are you? (e.g. 41)'
    } else {
      const userInput = text.toLowerCase()

      const userData = snapshot.val()
      let score = userData.score
      let nextState = userData.nextState

      if (userInput === 'reset' || userInput === 'start') {
        nextState = 0
      }

      console.log('  state ' + nextState + ' (userInput:'+userInput+', lastState:'+userData.lastState+')')
      switch (nextState) {
        //
        //////////////
        // State  0 //
        ////////////////////////////////////////////////////////////////////////
        case 0:
          dbUserRef.update({lastState: 0, nextState: 1, score: 0})
          return 'Hello, I am Diagnoser AI! I can tell if you\'re at risk for ' +
                 'prediabetes and connect you to effective help. Your chances ' +
                 'of successfully avoiding this condition are excellent!\n\n' +
                 'How many years old are you? (e.g. 41)'
        //
        //////////////
        // State  1 //
        ////////////////////////////////////////////////////////////////////////
        case 1:
          // TODO: parse age. Assign score.
          //       if unable to parse age, clarify with example.
          const age = parseInt(text)
          if (age === NaN) {
            dbUserRef.update({lastState: 1, nextState: 1})
            return 'I didn\'t understand ' + text + '. Try again:'
          } else if (age <= 0) {
            dbUserRef.update({lastState: 1, nextState: 1})
            return 'Let\'s try a number greater than zero. Try again:'
          }
          if (age >= 40 && age <= 49) {
            score += 1
          } else if (age >= 50 && age <= 59) {
            score += 2
          } else if (age >= 60) {
            score += 3
          }
          dbUserRef.update({lastState: 1, nextState: 2, score: score})
          return 'Okay. Next question--are you a male or female? (male or female)'
        //
        //////////////
        // State  2 //
        ////////////////////////////////////////////////////////////////////////
        case 2:
          // TODO: parse sex--male / female. Assign score.
          //       if unable to parse, clarify with example.
          //       if female nextState = 3
          //       if male nextState = 4

          if (userInput === 'male' || userInput === 'm' || userInput === 'man') {
            score += 1
            dbUserRef.update({lastState: 2, nextState: 4, score: score})
            return 'Thanks.\n\nDo you have a mother, father, sister, or brother with diabetes? (yes or no)'
          } else if (userInput === 'female' || userInput === 'w' ||
                     userInput === 'woman') {
            dbUserRef.update({lastState: 2, nextState: 3, score: score})
            return 'Thanks.\n\nHave you ever been diagnosed with gestational diabetes? (yes or no)'
          }
          dbUserRef.update({lastState: 2, nextState: 2})
          return 'I didn\'t understand ' + text + '.\n\nPlease try again, male or female?'
        //
        //////////////
        // State  3 //
        ////////////////////////////////////////////////////////////////////////
        case 3:
          // TODO: parse yes/no for gestational diabetes. Assign score.
          //       If unable to parse, ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 3, nextState: 3})
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 3, nextState: 4, score: score})
          return 'Do you have a mother, father, sister, or brother with diabetes? (yes or no)'
        //
        //////////////
        // State  4 //
        ////////////////////////////////////////////////////////////////////////
        case 4:
          // TODO: parse yes/no for family with diabetes. Assign score.
          //       If unable to parse ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 4, nextState: 4})
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 4, nextState: 5, score: score})
          return 'Have you ever been diagnosed with high blood pressure? (yes or no)'
        //
        //////////////
        // State  5 //
        ////////////////////////////////////////////////////////////////////////
        case 5:
          // TODO: parse yes/no for high blood pressure. Assign score.
          //       If unable to parse, ask again--clarify with example.
          // TODO: help them understand what physically active is
          if (userInput === 'yes' || userInput === 'y') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 5, nextState: 5})
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 5, nextState: 6, score: score})
          return 'Are you physically active? (yes or no)'
        //
        //////////////
        // State  6 //
        ////////////////////////////////////////////////////////////////////////
        case 6:
          // TODO: parse yes/no for physically active. Assign score.
          //       If unable to parse, ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y') {
            // no-op
          } else if (userInput === 'no' || userInput === 'n') {
            score += 1
          } else {
            dbUserRef.update({lastState: 6, nextState: 6})
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 6, nextState: 7, score: score})
          return 'What is your height? (e.g.: 5\'0")'
        //
        //////////////
        // State  7 //
        ////////////////////////////////////////////////////////////////////////
        case 7:
          // TODO: parse height in inches. Store height temporarily.
          //       If unable to parse, ask again--clarify with example.

          // Quick test for height format--TODO: something better that handles
          // spaces, units etc. (unicode and funky quotes too)
          console.log('Case 7. userInput:' + userInput)
          if (userInput.search(/[2-8]['’][0-9]+[01]*["”]/i) === -1) {
            dbUserRef.update({lastState: 7, nextState: 7})
            return 'I didn\'t understand ' + text + '. Try again: (e.g. 5\'0")'
          }

          dbUserRef.update({lastState: 7, nextState: 8, height: text})
          return 'What is your weight in pounds? (e.g.: 185)'
        //
        //////////////
        // State  8 //
        ////////////////////////////////////////////////////////////////////////
        case 8:
          // TODO: parse weight. Fetch height. Assign score. Respond accordingly.
          //       If unable to parse, ask again--clarify with example.
          const weight = parseInt(text)
          if (weight === NaN) {
            dbUserRef.update({lastState: 8, nextState: 8})
            return 'I didn\'t understand ' + text + '. Try again:'
          } else if (weight <= 0) {
            dbUserRef.update({lastState: 8, nextState: 8})
            return 'Let\'s try a number greater than zero. Try again:'
          }

          const height = userData.height
          const hwScore = getHeightWeightScore(height, weight)
          if (hwScore === -1) {
            dbUserRef.update({lastState: 8, nextState: 7})
            // TODO: better BMI calc or alternate risk computation?
            return 'I had trouble computing your risk from your height and weight.' +
                   'Please enter your height again--it must be between 4\'10" and ' +
                   '6\'4"?'
          } else {
            score += hwScore
          }
          dbUserRef.update({lastState: 8, nextState: 9, score: score})
          if (score < 5) {
            return 'Congratulations! From the answers you provided, it does ' +
                   'not appear that you are at increased risk for ' +
                   'having type 2 diabetes.'
          }
          return 'From your answers, it appears you are at increased risk of ' +
                 'having type 2 diabetes. In future we\'ll be able to connect ' +
                 'you with healthcare resources that can help. For now, you ' +
                 'should see a doctor--and get a HBA1C test to confirm if ' +
                 'have type 2 diabetes or prediabetes.'

        default:
          return 'Thank you for participating. In future we\'ll be able to ' +
                 'connect you to a Diabetes Prevention Program if you were ' +
                 'found to be at risk. Type \'reset\' if you\'d like to try ' +
                 'the risk assessment again.'
      }
    }
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
