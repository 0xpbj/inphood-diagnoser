// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../bot/.env-production'})

const prompt = require('prompt')
const tp = require('../bot//textProcessor.js')

function letsPrompt() {
  return prompt.get(['diagnosisAI'], (err, result) => handlePrompt(err, result))
}

// We've created a recursive while-loop of promises here to simulate a chat session
// using prompt. letsPrompt is called initially and proxies user input to a message text
// processor, simulating our chatbot (to speed up development instead of using Lambda)
//
const userId = 1626118340810665  // AC
let text = undefined
function handlePrompt(err, result) {
  text = result.diagnosisAI
  console.log('> ' + text)

  if (text !== 'exit') {
    // Proxy the user's input to our message text processor (that uses Wit etc.)
    return tp.processMessage(userId, text)
    .then((result) => {
      console.log(result)
      return letsPrompt()
    })
    .catch(error => {
      console.log('textProcessor: ', error)
      return
    })
  }

  throw ''
}

prompt.start()
return letsPrompt()
