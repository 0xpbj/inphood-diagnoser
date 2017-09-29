let dotEnv = require('dotenv').config({path: './.env-production'})

const requestPromise = require('request-promise')
const firebase = require('firebase')

const cryptoUtils = require('./cryptoUtils.js')

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

// The keys below are height in feet and inches with the quotes removed.
// For example:  4'10" --> 410
//
const heightWeightLUT = {
  '410': [119, 142, 143, 190, 191],
  '411': [124, 147, 148, 197, 198],
  '50': [128, 152, 153, 203, 204],
  '51': [132, 157, 158, 210, 211],
  '52': [136, 163, 164, 217, 218],
  '53': [141, 168, 169, 224, 225],
  '54': [145, 173, 174, 231, 232],
  '55': [150, 179, 180, 239, 240],
  '56': [155, 185, 186, 246, 247],
  '57': [159, 190, 191, 254, 255],
  '58': [164, 196, 197, 261, 262],
  '59': [169, 202, 203, 269, 270],
  '510': [174, 208, 209, 277, 278],
  '511': [179, 214, 215, 285, 286],
  '60': [184, 220, 221, 293, 294],
  '61': [189, 226, 227, 301, 302],
  '62': [194, 232, 233, 310, 311],
  '63': [200, 239, 240, 318, 319],
  '64': [205, 245, 246, 327, 328]
}

function getHeightWeightScore(height, weight) {
  console.log('getHeightWeightScore:')
  if (!height || !weight) {
    console.log('  returning -1: height or weight undefined/null/etc.')
    return -1
  }

  // TODO: put this in a single one liner regex w/ character classes
  let fixQuotesHeight = height.replace('’', '')
  fixQuotesHeight = fixQuotesHeight.replace('\'', '')
  fixQuotesHeight = fixQuotesHeight.replace('”', '')
  fixQuotesHeight = fixQuotesHeight.replace('"', '')
  fixQuotesHeight = fixQuotesHeight.replace(' ', '')

  if (!(fixQuotesHeight in heightWeightLUT)) {
    console.log('  returning -1: fixQuotesHeight('+fixQuotesHeight+') not in heightWeightLUT')
    return -1
  }

  console.log('  fixQuotesHeight:' + fixQuotesHeight)
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

function getIdFromRequest(request) {
  if (request.type === 'facebook') {
    return request.originalRequest.sender.id
  }
  else if (request.type === 'telegram') {
    return request.originalRequest.message.from.id
  }
  else if (request.type === 'twilio') {
    return request.sender
  }
  // TODO: other plafs...
  return undefined
}

// Do not enable this yet
const enableEncryption = false

function dbEncryptWrite(userId, dataObj) {
  const eDataObj = cryptoUtils.encryptObj(dataObj)

  console.log('dbEncryptWrite: ')
  console.log('  ' + eDataObj)
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/' + userId)

  if (enableEncryption) {
    dbUserRef.set(eDataObj)
  } else {
    dbUserRef.set(dataObj)
  }
}

function dbUpdateEncryptedObj(userId, dataObj, updateKeyValues) {
  for (key in updateKeyValues) {
    dataObj[key] = updateKeyValues[key]
  }

  dbEncryptWrite(userId, dataObj)
}

function diagnosisScript(request) {
  const text = request.text
  const userId = getIdFromRequest(request)

  console.log('diagnosisScript. userId:' + userId + ', text:' + text)
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/' + userId)

  return dbUserRef.once("value")
  .then(function(snapshot) {
    if (snapshot.val() === null) {
      console.log('  state -1 (initializing user in db)')
      ///////////////
      // State  -1 //
      //////////////////////////////////////////////////////////////////////////
      let client = request.type
      const theDate = new Date()
      let setupTime = theDate.toUTCString()

      if (client === 'facebook') {
        // TODO: Prabhaav fix the access token etc. below to prevent the error in
        //       this link--then uncomment the code in the requestPromise below:
        //
        // https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logEventViewer:group=/aws/lambda/diagnoser;stream=2017/09/29/%5B$LATEST%5Daaba390e61d34ff69e9bff4ae963848a
        var fbOptions = {
          uri: 'https://graph.facebook.com/v2.6/' + userId,
          method: 'GET',
          json: true,
          qs: {
            fields: 'first_name,last_name,profile_pic,locale,timezone,gender',
            access_token: 'EAAJhTtF5K30BAObDIIHWxtZA0EtwbVX6wEciIZAHwrwBJrXVXFZCy69Pn07SoyzZAeZCEmswE0jUzamY7Nfy71cZB8O7BSZBpTZAgbDxoYEE5Og7nbkoQvMaCafrBkH151s4wl91zOCLbafkdJiWLIc6deW9jSZBYdjh2NE4JbDSZBAwZDZD'
          },
          resolveWithFullResponse: true
        }
        return requestPromise(fbOptions)
        .then(result => {
          const {first_name, last_name, locale, timezone, gender} = result.body
          dbUserRef.update({lastState: -1, nextState: 0, score: 0,
            first_name: first_name, last_name: last_name, locale: locale,
            client: client, userId: userId, timezone: timezone, gender: gender,
            setupTime: setupTime})
          // dbEncryptWrite(userId, dataObj)

            // Interestingly, in Spanish, names of languages are not capitalized.
            // See: http://www.spanishdict.com/answers/225670/i-didnt-know-that-rules-of-spanish-capitalization
            return 'Please type \'1\' to chat in English.\n' +
                   'Escribe \'2\' para chatear en español.'
        })
        .catch(error => {
          console.log('FB Profile error:', error)
          return ''
        })
      } else {
        let dataObj = {lastState: -1, nextState: 0, score: 0,
          client: client, userId: userId, setupTime: setupTime}

        if (client === 'telegram') {
          let first_name = request.originalRequest.message.from.first_name
          let last_name = request.originalRequest.message.from.last_name
          let locale = request.originalRequest.message.from.language_code
          // Check for undefined (cuases problems with firebase ref set otherwise)
          if (first_name) {
            dataObj.first_name = first_name
          }
          if (last_name) {
            dataObj.last_name = last_name
          }
          if (locale) {
            dataObj.locale = locale
          }
        }

        dbUserRef.update(dataObj)
        // dbEncryptWrite(userId, dataObj)

        // Interestingly, in Spanish, names of languages are not capitalized.
        // See: http://www.spanishdict.com/answers/225670/i-didnt-know-that-rules-of-spanish-capitalization
        return 'Please type \'1\' to chat in English.\n' +
               'Escribe \'2\' para chatear en español.'
      }
    } else {
      const userInput = text.toLowerCase()

      let userData = (enableEncryption) ?
        cryptoUtils.decryptObj(snapshot.val()) :
        snapshot.val()

      let score = userData.score
      let nextState = userData.nextState
      let language = userData.language

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
          if (userInput === '1' || userInput === 'english') {
            language = 'US_English'
          } else if (userInput === '2' || userInput === 'español' || userInput === 'espanol') {
            language = 'Spanish'
          } else if (userInput === 'reset' || userInput === 'start') {
            // dbUserRef.update({lastState: 0, nextState: 0, score: 0})
            return 'Please type \'1\' to chat in English.\n' +
                   'Escribe \'2\' para chatear en español.'
          } else {
            dbUserRef.update({lastState: 0, nextState: 0, score: 0})
            return 'I didn\'t understand ' + userInput + ', please type \'1\' to chat in English.\n' +
                   'No entendi ' + userInput + '. Escribe \'2\' para chatear en español.'
          }
          dbUserRef.update({lastState: 0, nextState: 1, score: 0, language: language})

          // TODO: Move this to a file and make it more regular and based on a
          //       predicate involving state and language:
          if (language === 'Spanish') {
            return 'Hola, soy AI de diagnóstico! Puedo decir si usted está en ' +
              'riesgo de diabetes tipo 2 o prediabetes y conectar con la ayuda ' +
              'efectiva. Sus posibilidades de evitar con éxito esta condición ' +
              'son excelentes!\n\n' +
              '¿Qué edad tiene? (por ejemplo, 41)'
          }
          return 'Hello, I am Diagnoser AI! I can tell if you\'re at risk for ' +
             'type 2 diabetes or prediabetes and connect you to effective help. ' +
             'Your chances of successfully avoiding this condition are excellent!\n\n' +
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
            if (language === 'Spanish') {
              return 'No entendí '+ text +'. Inténtalo de nuevo:'
            }
            return 'I didn\'t understand ' + text + '. Try again:'
          } else if (age <= 0) {
            dbUserRef.update({lastState: 1, nextState: 1})
            if (language === 'Spanish') {
              return 'Probemos un número mayor que cero. Inténtalo de nuevo:'
            }
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
          if (language === 'Spanish') {
            return 'Bueno. ¿Es usted hombre o mujer? ' +
              '(hombre o mujer)'
          }
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

          if (((language === 'Spanish') &&
               (userInput === 'hombre' || userInput === 'h')) ||
              ((language === 'US_English') &&
               (userInput === 'male' || userInput === 'm' || userInput === 'man'))) {
            score += 1
            dbUserRef.update({lastState: 2, nextState: 4, score: score})
            if (language === 'Spanish') {
              return 'Gracias.\n\n¿Tienes familiares (mamá, papá, hermano, hermana) que padecen diabetes? (si o no)'
            }
            return 'Thanks.\n\nDo you have a mother, father, sister, or brother with diabetes? (yes or no)'
          } else if (((language === 'Spanish') &&
                      (userInput === 'mujer' || userInput === 'm')) ||
                     ((language === 'US_English') &&
                      (userInput === 'female' || userInput === 'f' ||
                       userInput === 'w' || userInput === 'woman'))) {
            dbUserRef.update({lastState: 2, nextState: 3, score: score})
            if (language === 'Spanish') {
              return 'Gracias.\n\n¿tuvo alguna vez diabetes gestacional (glucosa/azúcar alta durante el embarazo)? (si o no)'
            }
            return 'Thanks.\n\nHave you ever been diagnosed with gestational diabetes? (yes or no)'
          }
          dbUserRef.update({lastState: 2, nextState: 2})
          if (language === 'Spanish') {
            return 'No entendí '+ text +'.\n\nPor favor, inténtelo de nuevo. ¿Es usted hombre o mujer?'
          }
          return 'I didn\'t understand ' + text + '.\n\nPlease try again, male or female?'
        //
        //////////////
        // State  3 //
        ////////////////////////////////////////////////////////////////////////
        case 3:
          // TODO: parse yes/no for gestational diabetes. Assign score.
          //       If unable to parse, ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y' || userInput === 'sí' || userInput === 'si' || userInput === 's') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 3, nextState: 3})
            if (language === 'Spanish') {
              return 'No entendí '+ text +'. Inténtalo de nuevo: (sí o no)'
            }
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 3, nextState: 4, score: score})
          if (language === 'Spanish') {
            return '¿Tienes familiares (mamá, papá, hermano, hermana) que padecen diabetes? (si o no)'
          }
          return 'Do you have a mother, father, sister, or brother with diabetes? (yes or no)'
        //
        //////////////
        // State  4 //
        ////////////////////////////////////////////////////////////////////////
        case 4:
          // TODO: parse yes/no for family with diabetes. Assign score.
          //       If unable to parse ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y' || userInput === 'sí' || userInput === 'si' || userInput === 's') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 4, nextState: 4})
            if (language === 'Spanish') {
              return 'No entendí '+ text +'. Inténtalo de nuevo: (sí o no)'
            }
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 4, nextState: 5, score: score})
          if (language === 'Spanish') {
            return '¿Alguna vez le ha dicho un profesional de salud que tiene presión arterial alta (o hipertensión)? (si o no)'
          }
          return 'Have you ever been diagnosed with high blood pressure? (yes or no)'
        //
        //////////////
        // State  5 //
        ////////////////////////////////////////////////////////////////////////
        case 5:
          // TODO: parse yes/no for high blood pressure. Assign score.
          //       If unable to parse, ask again--clarify with example.
          // TODO: help them understand what physically active is
          if (userInput === 'yes' || userInput === 'y' || userInput === 'sí' || userInput === 'si' || userInput === 's') {
            score += 1
          } else if (userInput === 'no' || userInput === 'n') {
            // no-op
          } else {
            dbUserRef.update({lastState: 5, nextState: 5})
            if (language === 'Spanish') {
              return 'No entendí '+ text +'. Inténtalo de nuevo: (sí o no)'
            }
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 5, nextState: 6, score: score})
          if (language === 'Spanish') {
            return '¿Realiza algún tipo de actividad físcia? (si o no)'
          }
          return 'Are you physically active? (yes or no)'
        //
        //////////////
        // State  6 //
        ////////////////////////////////////////////////////////////////////////
        case 6:
          // TODO: parse yes/no for physically active. Assign score.
          //       If unable to parse, ask again--clarify with example.
          if (userInput === 'yes' || userInput === 'y' || userInput === 'sí' || userInput === 'si' || userInput === 's') {
            // no-op
          } else if (userInput === 'no' || userInput === 'n') {
            score += 1
          } else {
            dbUserRef.update({lastState: 6, nextState: 6})
            if (language === 'Spanish') {
              return 'No entendí '+ text +'. Inténtalo de nuevo: (sí o no)'
            }
            return 'I didn\'t understand ' + text + '. Try again: (yes or no)'
          }
          dbUserRef.update({lastState: 6, nextState: 7, score: score})
          if (language === 'Spanish') {
            return 'Cuan alto eres (por ejemplo: 5 0  ó  5\'O")'
          }
          return 'What is your height? (e.g.: 5 0  or  5\'0")'
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
          const position = userInput.search(/[2-8]['’\s][0-9]+[01]*["”]*/i)
          if (position === -1) {
            dbUserRef.update({lastState: 7, nextState: 7})
            console.log('  Position: '+position)
            if (language === 'Spanish') {
              return 'No entendí' + text + '. Intente de nuevo: (por ejemplo: 5 0  ó  5\'0")'
            }
            return 'I didn\'t understand ' + text + '. Try again: (e.g.: 5 0  or 5\'0")'
          }

          dbUserRef.update({lastState: 7, nextState: 8, height: text})
          if (language === 'Spanish') {
            return '¿Cuál es su peso en libras? (por ejemplo: 185)'
          }
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
            if (language === 'Spanish') {
              return 'No entendí' + text + '. Inténtalo de nuevo:'
            }
            return 'I didn\'t understand ' + text + '. Try again:'
          } else if (weight <= 0) {
            dbUserRef.update({lastState: 8, nextState: 8})
            if (language === 'Spanish') {
              return 'Probemos un número mayor que cero. Inténtalo de nuevo:'
            }
            return 'Let\'s try a number greater than zero. Try again:'
          }

          const height = userData.height
          const hwScore = getHeightWeightScore(height, weight)
          if (hwScore === -1) {
            dbUserRef.update({lastState: 8, nextState: 7})
            // TODO: better BMI calc or alternate risk computation?
            if (language === 'Spanish') {
              return 'Tuve problemas para calcular el riesgo de su altura y ' +
                     'peso. Por favor, introduzca su altura de nuevo - que ' +
                     'debe ser entre 4\'10" y 6\'4"?'
            }
            return 'I had trouble computing your risk from your height and weight.' +
                   'Please enter your height again--it must be between 4\'10" and ' +
                   '6\'4"?'
          } else {
            score += hwScore
          }
          // TODO: Prabhaav
          //    These long messages will work fine in Facebook messenger and
          //    Telegram, but they will fail in Twilio because of the 160 character
          //    SMS limit. Here's a doc on that from Twilio:
          //    https://support.twilio.com/hc/en-us/articles/223181508-Does-Twilio-support-concatenated-SMS-messages-or-messages-over-160-characters-
          //       - you can either work with them to correct that or
          //         shorten the messages
          dbUserRef.update({lastState: 8, nextState: 9, score: score})
          if (score < 5) {
            if (language === 'Spanish') {
              return [
                '¡Felicitaciones! De las respuestas que proporcionó, no ' +
                'parece que usted está en mayor riesgo de tener diabetes ' +
                'tipo 2.',
                '¡Ayúdenos a difundir la palabra sobre la Diabetes Tipo 2! ' +
                'Comparte el chatbot con tus amigos y familiares 🎁!',
                'Texto: +1 (415) 917-4663\n' +
                'Facebook: m.me/diagnoserai\n' +
                'Telegram: t.me/diagnoserbot']
            }
            return [
              'Congratulations! From the answers you provided, it does ' +
              'not appear that you are at increased risk for ' +
              'having type 2 diabetes. ',
              'Help us spread the word about Type 2 Diabetes! ' +
              'Share the chatbot with your friends and family 🎁!',
              'Text: +1(415) 917-4663 \n' +
              'Facebook: m.me/diagnoserai\n' +
              'Telegram: t.me/diagnoserbot']
          }
          else {
            if (language === 'Spanish') {
              return [
                'De sus respuestas, parece que usted está en mayor riesgo de ' +
                'tener diabetes tipo 2. En el futuro, podremos conectarte con ' +
                'recursos de salud que pueden ayudarte. Por ahora, debe ' +
                'consultar a un médico y obtener una prueba HBA1C para ' +
                'confirmar si tiene diabetes tipo 2 o prediabetes. Más ' +
                'información: https://doihaveprediabetes.org/',
                '¿Desea que localizemos la clínica HBA1C más cercana para ' +
                'confirmar su diagnóstico? (si o no)']
            }
            return [
              'From your answers, it appears you are at increased risk of ' +
              'having type 2 diabetes. In future we\'ll be able to connect ' +
              'you with healthcare resources that can help. For now, you ' +
              'should see a doctor--and get a HBA1C test to confirm if ' +
              'have type 2 diabetes or prediabetes. ' +
              'Learn more: https://doihaveprediabetes.org/ ' ,
              'Would you like us to locate the closest HBA1C clinic to ' +
              'confirm your diagnosis? (yes or no)']
          }
        //
        //////////////
        // State  9 //
        ////////////////////////////////////////////////////////////////////////
        case 9:
          dbUserRef.update({lastState: 9, nextState: 10, clinicFinder: text})
          if (language === 'Spanish') {
            return [
              '¡Gracias por su interés! Le enviaremos una actualización ' +
              'cuando tengamos la función de localizador de clínica en su lugar.',
              '¡Ayúdenos a difundir la palabra sobre la Diabetes Tipo 2! ' +
              'Comparte el chatbot con tus amigos y familiares 🎁!',
              'Texto: +1 (415) 917-4663\n' +
              'Facebook: m.me/diagnoserai\n' +
              'Telegram: t.me/diagnoserbot']
          }
          return [
            'Thank you for your interest! We will send you an update when we have the clinic locator feature is in place.',
            'Help us spread the word about Type 2 Diabetes! ' +
            'Share the chatbot with your friends and family 🎁!',
            'Text: +1(415) 917-4663 \n' +
            'Facebook: m.me/diagnoserai\n' +
            'Telegram: t.me/diagnoserbot']
        //
        //////////////
        // No State //
        ////////////////////////////////////////////////////////////////////////
        default:
          if (language === 'Spanish') {
            return 'Gracias por participar. En el futuro, podremos conectarlo ' +
                   'a un Programa de Prevención de la Diabetes si se ' +
                   'encuentra que está en riesgo. Escriba \'reset \' si desea ' +
                   'probar de nuevo la evaluación de riesgos.'
          }
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
