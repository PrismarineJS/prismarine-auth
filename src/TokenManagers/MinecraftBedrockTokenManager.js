const fs = require('fs')
const path = require('path')
const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class BedrockTokenManager {
  constructor (cacheLocation) {
    this.cacheLocation = cacheLocation || path.join(__dirname, './bed-cache.json')
    try {
      this.cache = JSON.parse(fs.readFileSync(this.cacheLocation, 'utf8'))
    } catch (e) {
      this.cache = {}
    }
  }

  getCachedAccessToken () {
    const token = this.cache.mca
    debug('[mc] token cache', this.cache)
    if (!token) return
    debug('Auth token', token)
    const jwt = token.chain[0]
      const [header, payload, signature] = jwt.split('.').map(k => Buffer.from(k, 'base64')) // eslint-disable-line

    const body = JSON.parse(String(payload))
    const expires = new Date(body.exp * 1000)
    const remainingMs = expires - Date.now()
    const valid = remainingMs > 1000
    return { valid, until: expires, chain: token.chain }
  }

  setCachedAccessToken (data) {
    data.obtainedOn = Date.now()
    this.cache.mca = data
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  async verifyTokens () {
    const at = this.getCachedAccessToken()
    if (!at || this.forceRefresh) {
      return false
    }
    debug('[mc] have user access token', at)
    if (at.valid) {
      return true
    }
    return false
  }

  async getAccessToken (clientPublicKey, xsts) {
    debug('[mc] authing to minecraft', clientPublicKey, xsts)
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'node-minecraft-protocol',
      Authorization: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}`
    }
    const MineServicesResponse = await fetch(Endpoints.BedrockAuth, {
      method: 'post',
      headers,
      body: JSON.stringify({ identityPublicKey: clientPublicKey })
    }).then(checkStatus)

    debug('[mc] mc auth response', MineServicesResponse)
    this.setCachedAccessToken(MineServicesResponse)
    return MineServicesResponse
  }
}

module.exports = BedrockTokenManager
