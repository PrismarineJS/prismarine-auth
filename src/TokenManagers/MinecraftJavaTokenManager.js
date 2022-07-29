const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')
const crypto = require('crypto')

const { Endpoints, fetchOptions } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

const toDER = pem => pem.split('\n').slice(1, -1).reduce((acc, cur) => Buffer.concat([acc, Buffer.from(cur, 'base64')]), Buffer.alloc(0))

class MinecraftJavaTokenManager {
  constructor (cache) {
    this.cache = cache
  }

  async getCachedAccessToken () {
    const { mca: token } = await this.cache.getCached()
    debug('[mc] token cache', token)
    if (!token) return
    const expires = token.obtainedOn + (token.expires_in * 1000)
    const remaining = expires - Date.now()
    const valid = remaining > 1000
    return { valid, until: expires, token: token.access_token, data: token }
  }

  async setCachedAccessToken (data) {
    await this.cache.setCachedPartial({
      mca: {
        ...data,
        obtainedOn: Date.now()
      }
    })
  }

  async verifyTokens () {
    const at = await this.getCachedAccessToken()
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
    await this.setCachedAccessToken(MineServicesResponse)
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

  async fetchCertificates (accessToken) {
    debug(`[mc] fetching key-pair with ${accessToken.slice(0, 16)}`)
    const headers = { ...fetchOptions.headers, Authorization: `Bearer ${accessToken}` }
    const cert = await fetch(Endpoints.MinecraftServicesCertificate, { method: 'post', headers }).then(checkStatus)
    debug('[mc] got key-pair')
    const profileKeys = {
      publicPEM: cert.keyPair.publicKey,
      privatePEM: cert.keyPair.privateKey,
      publicDER: toDER(cert.keyPair.publicKey),
      privateDER: toDER(cert.keyPair.privateKey),
      signature: Buffer.from(cert.publicKeySignature, 'base64'),
      expiresOn: new Date(cert.expiresAt),
      refreshAfter: new Date(cert.refreshedAfter)
    }
    profileKeys.public = crypto.createPublicKey({ key: profileKeys.publicDER, format: 'der', type: 'spki' })
    profileKeys.private = crypto.createPrivateKey({ key: profileKeys.privateDER, format: 'der', type: 'pkcs8' })
    return { profileKeys }
  }
}
module.exports = MinecraftJavaTokenManager
