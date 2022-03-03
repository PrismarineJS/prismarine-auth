const { checkStatus } = require('./common/Util')
const fetch = require('node-fetch')

const baseHeaders = (additionalHeaders = {}) => ({
  'User-Agent': '@prismarineJS/prismarine-auth',
  'Client-Version': '0.0.0',
  ...additionalHeaders
})

module.exports = (url, options) => token => {
  return fetch(url, { ...options, headers: { ...baseHeaders(options.headers), Authorization: `XBL3.0 x=${token.userHash};${token.XSTSToken}` } }).then(checkStatus)
}
