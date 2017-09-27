let dotEnv = require('dotenv').config({path: './../.env-production'})
let botBuilder = require('claudia-bot-builder')
let tp = require('./textProcessor.js')

module.exports = botBuilder(function (request) {
  const userId = request.originalRequest.sender.id
  const text = request.text

  return tp.processMessage(userId, text)

}, { platforms: ['facebook', 'twilio', 'viber', 'telegram', 'kik', 'groupme'] })
