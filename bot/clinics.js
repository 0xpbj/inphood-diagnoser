const locations = {
  '3351 El Camino Real, Suite 100, Atherton, CA 94027': {
    name: 'Gardner Packard Children’s Health Center',
    address: '3351 El Camino Real, Suite 100, Atherton, CA 94027',
    hours: 'Monday – Friday 8:00am – 5:00pm',
    phone: '650.362.2500'
  },
  '1621 Gold Street, Alviso, CA 95002': {
    name: 'Alviso Health Center',
    address: '1621 Gold Street, Alviso, CA 95002',
    hours: 'Monday – Friday 8:00am – 5:30pm',
    phone: '408.935.3900'
  },
  '7526 Monterey Street, Gilroy, CA 95020': {
    name: 'Gardner South County Health Center',
    address: '7526 Monterey Street, Gilroy, CA 95020',
    hours: 'Monday – Saturday 8:00am – 5:00pm',
    phone: '408.848.9400'
  },
  '614 Tully Road, San Jose, CA 95111' : {
    name: 'Proyecto Primavera',
    address: '614 Tully Road, San Jose, CA 95111',
    hours: 'Monday – Friday 8:00am – 5:00pm',
    phone: '408.977.1591'
  },
  '725 East Santa Clara Street, San Jose, CA 95112': 
  {
    name: 'Gardner Downtown Health Center',
    address: '725 East Santa Clara Street, San Jose, CA 95112',
    hours: 'Monday – Friday 8:30am – 5:30pm',
    phone: '669.444.5460'
  },
  '195 East Virginia Street San Jose, CA 95112': {
    name: 'Gardner Health Center',
    address: '195 East Virginia Street San Jose, CA 95112',
    hours: 'Monday – Friday 8:30am – 5:30pm',
    phone: '408.918.5500'
  },
  '55 East Julian Street, San Jose, CA 95112': {
    name: 'St. James Health Center',
    address: '55 East Julian Street, San Jose, CA 95112',
    hours: 'Monday – Friday 8:30am – 5:30pm',
    phone: '408.918.2600'
  },
  '160 East Virginia Street, San Jose, CA 95112': {
    name: 'Centro de Bienestar',
    address: '160 East Virginia Street, San Jose, CA 95112',
    hours: 'Monday – Friday 8:00am – 5:30pm',
    phone: '408.287.6200'
  },
  '3030 Alum Rock Avenue, San Jose, CA 95127' : {
    name: 'CompreCare Health Center',
    address: '3030 Alum Rock Avenue, San Jose, CA 95127',
    hours: 'Monday – Saturday 8:00am – 5:30pm',
    phone: '408.272.6300'
  }
}

exports.finder = function(text) {
  let destinations = ''
  let destArray = []
  for (let it in locations) {
    destinations += it + '|'
    destArray.push(it)
  }
  const grequest = require('request-promise')
  let options = {
    uri: 'https://maps.googleapis.com/maps/api/distancematrix/json',
    method: 'GET',
    qs: {
      units: 'imperial',
      origins: text,
      destinations,
      key: process.env.GOOGLE_MAPS_API_KEY
    },
    json: true,
    resolveWithFullResponse: true
  }
  return grequest(options)
  .then(result => {
    const {body} = result
    const {rows} = body
    const {elements} = rows[0]
    let lowDist = null
    let index = 0
    let lowDistLoc = ''
    for (let it of elements) {
      const {value} = it.distance
      if (!lowDist) {
        lowDist = value
        lowDistLoc = destArray[index]
      }
      if (lowDist > value) {
        lowDist = value
        lowDistLoc = destArray[index]
      }
      index++
    }
    return locations[lowDistLoc]
  })
  .catch(error => {
    console.log('Google location error: ', error)
  })
}