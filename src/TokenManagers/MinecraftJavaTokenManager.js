const fs = require('fs')
const path = require('path')
const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')

const { Authentication } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class MinecraftJavaTokenManager {
  constructor (cacheLocation) {
    this.cacheLocation = cacheLocation || path.join(__dirname, './mca-cache.json')
    try {
      this.cache = require(this.cacheLocation)
    } catch (e) {
      this.cache = {}
    }
  }

  getCachedAccessToken () {
    const token = this.cache.mca
    debug('[mc] token cache', this.cache)
    if (!token) return
    const expires = token.obtainedOn + (token.expires_in * 1000)
    const remaining = expires - Date.now()
    const valid = remaining > 1000
    return { valid, until: expires, token: token.access_token, data: token }
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

  async getAccessToken (xsts) {
    debug('[mc] authing to minecraft', xsts)
    const getFetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'node-minecraft-protocol'
      }
    }

    const MineServicesResponse = await fetch(Authentication.MinecraftServicesLogWithXbox, {
      method: 'post',
      ...getFetchOptions,
      body: JSON.stringify({ identityToken: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}` })
    }).then(checkStatus)

    debug('[mc] mc auth response', MineServicesResponse)
    this.setCachedAccessToken(MineServicesResponse)
    return MineServicesResponse.access_token
  }
}
module.exports = MinecraftJavaTokenManager
