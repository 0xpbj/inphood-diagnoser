let botBuilder = require('claudia-bot-builder')
let tp = require('./textProcessor.js')

module.exports = botBuilder(function (request) {
  // return text
  return tp.processMessage(request)

}, { platforms: ['facebook', 'twilio', 'telegram'] })
