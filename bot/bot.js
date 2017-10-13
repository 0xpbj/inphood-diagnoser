const promiseDelay = require('promise-delay')
const aws = require('aws-sdk')
const lambda = new aws.Lambda()
const botBuilder = require('claudia-bot-builder')
const slackDelayedReply = botBuilder.slackDelayedReply
const tp = require('./textProcessor.js')

const api = botBuilder((request, apiRequest) => {
  console.log(request)
  console.log(apiRequest)
  if (apiRequest.type === 'slack-slash-command') {
    return new Promise((resolve, reject) => {
      lambda.invoke({
        FunctionName: apiRequest.lambdaContext.functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          slackEvent: request // this will enable us to detect the event later and filter it
        }),
        Qualifier: apiRequest.lambdaContext.functionVersion
      }, (err, done) => {
        if (err) return reject(err)

        resolve()
      })
    })
    .then(() => {
      return { // the initial response
        text: `processing...`,
        response_type: 'in_channel'
      }
    })
    .catch(() => {
      return `Could not process image`
    })
  }
  return tp.processMessage(request)
})

api.intercept((event) => {
  if (!event.slackEvent) // if this is a normal web request, let it run
    return event

  const message = event.slackEvent
  const seconds = parseInt(message.text, 10)

  return promiseDelay(seconds * 1000)
  .then(() => {
    return slackDelayedReply(message, {
      text: `${seconds} seconds passed.`,
      response_type: 'in_channel'
    })
  })
  .then(() => false) // prevent normal execution
})

module.exports = api