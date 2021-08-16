const fs = require('fs')
const path = require('path')
const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')

const { Endpoints, fetchOptions } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class MinecraftJavaTokenManager {
  constructor (cacheLocation) {
    this.cacheLocation = cacheLocation || path.join(__dirname, './mca-cache.json')
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
    const MineServicesResponse = await fetch(Endpoints.MinecraftServicesLogWithXbox, {
      method: 'post',
      ...fetchOptions,
      body: JSON.stringify({ identityToken: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}` })
    }).then(checkStatus)

    debug('[mc] mc auth response', MineServicesResponse)
    this.setCachedAccessToken(MineServicesResponse)
    return MineServicesResponse.access_token
  }

  async fetchProfile (accessToken) {
    debug(`[mc] fetching minecraft profile with ${accessToken.slice(0, 16)}`)
    const headers = { ...fetchOptions.headers, Authorization: `Bearer ${accessToken}` }
    const profile = await fetch(Endpoints.MinecraftServicesProfile, { headers })
      .then(checkStatus)
    debug(`[mc] got profile response: ${profile}`)
    return profile
  }

  /**
 * Fetches any product licenses attached to this accesstoken
 * @param {string} accessToken
 * @returns {object}
 */
  async fetchEntitlements (accessToken) {
    debug(`[mc] fetching entitlements with ${accessToken.slice(0, 16)}`)
    const headers = { ...fetchOptions.headers, Authorization: `Bearer ${accessToken}` }
    const entitlements = await fetch(Endpoints.MinecraftServicesEntitlement, { headers }).then(checkStatus)
    debug(`[mc] got entitlement response: ${entitlements}`)
    return entitlements
  }
}
module.exports = MinecraftJavaTokenManager
