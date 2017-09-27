let botBuilder = require('claudia-bot-builder')
let tp = require('./textProcessor.js')

module.exports = botBuilder(function (request) {
  const text = request.text
  let userId
  if (request.type === 'facebook') {
    userId = request.originalRequest.sender.id
  }
  else if (request.type === 'telegram') {
    userId = request.originalRequest.message.from.id
  }
  else if (request.type === 'twilio') {
    userId = request.sender
    console.log(request, request.originalRequest)
  }
  // return text
  return tp.processMessage(userId, text)

}, { platforms: ['facebook', 'twilio', 'viber', 'telegram', 'kik', 'groupme'] })
