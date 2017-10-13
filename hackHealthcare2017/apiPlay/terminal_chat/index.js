// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../.env-production'})

const prompt = require('prompt')

function doctorSearch() {
  const api_key = process.env.BETTERDOCTOR_COM_API_KEY
  console.log('api_key: ' + api_key)
  const resource_url = 'https://api.betterdoctor.com/2016-03-01/doctors?location=37.773,-122.413,100&skip=2&limit=10&user_key=' + api_key;

  var bdOpts = {
    uri: resource_url,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true
  }

  return requestPromise(bdOpts)
  .then(data => {
  })
  .catch(error => {
    console.log('doctorSearch error:', error)
    return ''
  })
}

//
// $.get(resource_url, function (data) {
//     // data: { meta: {<metadata>}, data: {<array[Practice]>} }
//     var template = Handlebars.compile(document.getElementById('docs-template').innerHTML);
//     document.getElementById('content-placeholder').innerHTML = template(data);
// });

function letsPrompt() {
  return prompt.get(['apiTester'], (err, result) => handlePrompt(err, result))
}

// We've created a recursive while-loop of promises here to simulate a chat session
// using prompt. letsPrompt is called initially and proxies user input to a message text
// processor, simulating our chatbot (to speed up development instead of using Lambda)
//
let text = undefined

function handlePrompt(err, result) {
  text = result.apiTester
  if (text === 'exit') {
    return
  }
  doctorSearch()
  return letsPrompt()
}

prompt.start()
return letsPrompt()
