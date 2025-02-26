const debug = require('debug')('prismarine-auth')
const crypto = require('crypto')

async function checkStatus (res) {
  if (res.ok) { // res.status >= 200 && res.status < 300
    return res.json()
  } else {
    const resp = await res.text()
    debug('Request fail', resp)
    throw Error(`${res.status} ${res.statusText} ${resp}`)
  }
}

function checkStatusWithHelp (errorDict) {
  return async function (res) {
    if (res.ok) return res.json() // res.status >= 200 && res.status < 300
    const resp = await res.text()
    debug('Request fail', resp)
    throw new Error(`${res.status} ${res.statusText} ${resp} ${errorDict[res.status] ?? ''}`)
  }
}

function createHash (input) {
  return crypto.createHash('sha1')
    .update(input ?? '', 'binary')
    .digest('hex').substr(0, 6)
}

function nextUUID () {
  return globalThis.crypto.randomUUID()
}

module.exports = { checkStatus, checkStatusWithHelp, createHash, nextUUID }
