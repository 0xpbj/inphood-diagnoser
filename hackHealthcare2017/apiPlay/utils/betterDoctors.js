// This path is okay b/c this code doesn't get bundled to AWS lambda
let dotEnv = require('dotenv').config({path: './../.env-production'})
const requestPromise = require('request-promise')

function doctorSearch(location='37.773,-122.413', radius='100', limit='10') {
  const api_key = process.env.BETTERDOCTOR_COM_API_KEY
  console.log('api_key: ' + api_key)
  const resource_url = 'https://api.betterdoctor.com/2016-03-01/doctors?location='+location+','+radius+'&skip=2&limit='+limit+'&user_key=' + api_key;

  var bdOpts = {
    uri: resource_url,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true
  }

  return requestPromise(bdOpts)
  .then(data => {
    // console.log(data.body)
    console.log('doctorSearch results')
    console.log('')
    console.log('data.body.meta')
    console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ')
    console.log(data.body.meta)
    console.log('')
    console.log('data.body.data[]')
    console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ')
    for (let dataNode of data.body.data) {
      const profile = dataNode.profile
      const specialties = dataNode.specialties
      const practices = dataNode.practices  // array of location objects
      const insurances = dataNode.insurances  // array of {plan: provider}

      console.log(profile.first_name + ' ' + profile.middle_name + ' ' + profile.last_name)
      // profile has property image_url

      console.log('   -----')
      for (let specialty of specialties) {
        console.log('   ' + specialty.actor)
      }
      console.log('   -----')
      for (let practice of practices) {
        console.log('   ' + practice.name + ' (' + practice.distance + ' miles)')
      }
      console.log('   -----')
      let count = 0
      for (let insurance of insurances) {
        count++
        if (count > 3) {
          console.log('   ...')
          break
        }

        // console.log('   insurance_plan:')
        // for (let propName in insurance.insurance_plan) {
        //   console.log('   ' + propName + ': ' + insurance.insurance_plan[propName])
        // }
        // console.log('   insurance_provider:')
        // for (let propName in insurance.insurance_provider) {
        //   console.log('   ' + propName + ': ' + insurance.insurance_provider[propName])
        // }
        console.log('   ' + insurance.insurance_plan.name + ' ('+ insurance.insurance_provider.name +')')

      }

      console.log('')
    }
  })
  .catch(error => {
    console.log('doctorSearch error:', error)
    return
  })
}

function main() {
  return doctorSearch()
}

main()
