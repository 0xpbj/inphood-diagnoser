let crypto = require('crypto')

// Big TODO: put the password in a config file that isn't checked in.
// TODO TODO TODO TODO
const password = 'h1pst3rMag1ck'
const algorithm = 'aes-256-ctr'

// Nodejs encryption with CTR
// (from: https://github.com/chris-rock/node-crypto-examples/blob/master/crypto-ctr.js)
exports.encryptStr = function(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

exports.decryptStr = function(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

// Conveniences added by AC to handle objects
exports.encryptObj = function(anObj) {
  const sObj = JSON.stringify(anObj)
  return exports.encryptStr(sObj)
}

exports.decryptObj = function(text) {
  const sObj = exports.decryptStr(text)
  return JSON.parse(sObj)
}
