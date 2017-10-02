let testObj = {
  first: 'Alex',
  last: 'Carreira',
  specNo: 1271
}

const secretKeyToPutInConfig = 'h1pst3rMag1ck'

// Nodejs encryption with CTR
// (from: https://github.com/chris-rock/node-crypto-examples/blob/master/crypto-ctr.js)
let crypto = require('crypto')
let algorithm = 'aes-256-ctr'
let password = secretKeyToPutInConfig

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function encryptObj(anObj) {
  const sObj = JSON.stringify(anObj)
  return encrypt(sObj)
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function decryptObj(text) {
  const sObj = decrypt(text)
  return JSON.parse(sObj)
}

let eObj = encryptObj(testObj)
console.log(eObj)
console.log('---------')
let obj = decryptObj(eObj)
console.log(obj)
