const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const XboxLiveAuth = require('@xboxreplay/xboxlive-auth')
const debug = require('debug')('prismarine-auth')
const { SmartBuffer } = require('smart-buffer')
const jose = require('jose-node-cjs-runtime/jwk/from_key_like')
const fetch = require('node-fetch')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

const UUID = require('uuid-1345')
const nextUUID = () => UUID.v3({ namespace: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', name: Date.now().toString() })

// Manages Xbox Live tokens for xboxlive.com
class XboxTokenManager {
  constructor (relyingParty, ecKey, cacheLocation) {
    this.relyingParty = relyingParty
    this.key = ecKey
    jose.fromKeyLike(ecKey.publicKey).then(jwk => {
      this.jwk = { ...jwk, alg: 'ES256', use: 'sig' }
    })
    this.cacheLocation = cacheLocation || path.join(__dirname, './xbl-cache.json')
    try {
      this.cache = require(this.cacheLocation)
    } catch (e) {
      this.cache = {}
    }

    this.headers = { 'Cache-Control': 'no-store, must-revalidate, no-cache', 'x-xbl-contract-version': 1 }
  }

  getCachedUserToken () {
    const token = this.cache.userToken
    if (!token) return
    const until = new Date(token.NotAfter)
    const dn = Date.now()
    const remainingMs = until - dn
    const valid = remainingMs > 1000
    return { valid, token: token.Token, data: token }
  }

  getCachedXstsToken () {
    const token = this.cache.xstsToken
    if (!token) return
    const until = new Date(token.expiresOn)
    const dn = Date.now()
    const remainingMs = until - dn
    const valid = remainingMs > 1000
    return { valid, token: token.XSTSToken, data: token }
  }

  setCachedUserToken (data) {
    this.cache.userToken = data
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  setCachedXstsToken (data) {
    this.cache.xstsToken = data
    fs.writeFileSync(this.cacheLocation, JSON.stringify(this.cache))
  }

  async verifyTokens () {
    const ut = this.getCachedUserToken()
    const xt = this.getCachedXstsToken()
    if (!ut || !xt || this.forceRefresh) {
      return false
    }
    debug('[xbl] have user, xsts', ut, xt)
    if (ut.valid && xt.valid) {
      return true
    } else if (ut.valid && !xt.valid) {
      try {
        await this.getXSTSToken(ut.data)
        return true
      } catch (e) {
        return false
      }
    }
    return false
  }

  async getUserToken (msaAccessToken, azure) {
    debug('[xbl] obtaining xbox token with ms token', msaAccessToken)
    msaAccessToken = (azure ? 'd=' : 't=') + msaAccessToken
    const xblUserToken = await XboxLiveAuth.exchangeRpsTicketForUserToken(msaAccessToken)
    this.setCachedUserToken(xblUserToken)
    debug('[xbl] user token:', xblUserToken)
    return xblUserToken
  }

  // Make signature for the data being sent to server with our private key; server is sent our public key in plaintext
  sign (url, authorizationToken, payload) {
    // Their backend servers use Windows epoch timestamps, account for that. The server is very picky,
    // bad percision or wrong epoch may fail the request.
    const windowsTimestamp = (BigInt((Date.now() / 1000) | 0) + 11644473600n) * 10000000n
    // Only the /uri?and-query-string
    const pathAndQuery = new URL(url).pathname

    // Allocate the buffer for signature, TS, path, tokens and payload and NUL termination
    const allocSize = /* sig */ 5 + /* ts */ 9 + /* POST */ 5 + pathAndQuery.length + 1 + authorizationToken.length + 1 + payload.length + 1
    const buf = SmartBuffer.fromSize(allocSize)
    buf.writeInt32BE(1) // Policy Version
    buf.writeUInt8(0)
    buf.writeBigUInt64BE(windowsTimestamp)
    buf.writeUInt8(0) // null term
    buf.writeStringNT('POST')
    buf.writeStringNT(pathAndQuery)
    buf.writeStringNT(authorizationToken)
    buf.writeStringNT(payload)

    // Get the signature from the payload
    const signature = crypto.sign('SHA256', buf.toBuffer(), { key: this.key.privateKey, dsaEncoding: 'ieee-p1363' })

    const header = SmartBuffer.fromSize(signature.length + 12)
    header.writeInt32BE(1) // Policy Version
    header.writeBigUInt64BE(windowsTimestamp)
    header.writeBuffer(signature) // Add signature at end of header

    return header.toBuffer()
  }

  async doReplayAuth (email, password) {
    try {
      const preAuthResponse = await XboxLiveAuth.preAuth()
      const logUserResponse = await XboxLiveAuth.logUser(preAuthResponse, { email, password })
      const exchangeRpsTicketForUserToken = await this.getUserToken(logUserResponse.access_token, true)
      const xsts = await this.getXSTSToken(exchangeRpsTicketForUserToken)
      return xsts
    } catch (error) {
      debug('Authentication using a password has failed.')
      debug(error)
      throw error
    }
  }

  // If we don't need Xbox Title Authentication, we can have xboxreplay lib
  // handle the auth, otherwise we need to build the request ourselves with
  // the extra token data.
  async getXSTSToken (xblUserToken, deviceToken, titleToken) {
    if (deviceToken && titleToken) return this.getXSTSTokenWithTitle(xblUserToken, deviceToken, titleToken)

    debug('[xbl] obtaining xsts token with xbox user token (with XboxReplay)', xblUserToken.Token)
    debug(this.relyingParty)
    const xsts = await XboxLiveAuth.exchangeUserTokenForXSTSIdentity(xblUserToken.Token, { XSTSRelyingParty: this.relyingParty, raw: false })
    this.setCachedXstsToken(xsts)
    debug('[xbl] xsts', xsts)
    return xsts
  }

  async getXSTSTokenWithTitle (xblUserToken, deviceToken, titleToken, optionalDisplayClaims) {
    const userToken = xblUserToken.Token
    debug('[xbl] obtaining xsts token with xbox user token', userToken)

    const payload = {
      RelyingParty: this.relyingParty,
      TokenType: 'JWT',
      Properties: {
        UserTokens: [userToken],
        DeviceToken: deviceToken,
        TitleToken: titleToken,
        OptionalDisplayClaims: optionalDisplayClaims,
        ProofKey: this.jwk,
        SandboxId: 'RETAIL'
      }
    }

    const body = JSON.stringify(payload)
    const signature = this.sign(Endpoints.XstsAuthorize, '', body).toString('base64')

    const headers = { ...this.headers, Signature: signature }

    const ret = await fetch(Endpoints.XstsAuthorize, { method: 'post', headers, body }).then(checkStatus)
    const xsts = {
      userXUID: ret.DisplayClaims.xui[0].xid || null,
      userHash: ret.DisplayClaims.xui[0].uhs,
      XSTSToken: ret.Token,
      expiresOn: ret.NotAfter
    }

    this.setCachedXstsToken(xsts)
    debug('[xbl] xsts', xsts)
    return xsts
  }

  /**
       * Requests an Xbox Live-related device token that uniquely links the XToken (aka xsts token)
       * @param {{ DeviceType, Version }} asDevice The hardware type and version to auth as, for example Android or Nintendo
       */
  async getDeviceToken (asDevice) {
    const payload = {
      Properties: {
        AuthMethod: 'ProofOfPossession',
        Id: `{${nextUUID()}}`,
        DeviceType: asDevice.DeviceType || 'Android',
        SerialNumber: `{${nextUUID()}}`,
        Version: asDevice.Version || '10',
        ProofKey: this.jwk
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    }

    const body = JSON.stringify(payload)
    const signature = this.sign(Endpoints.XboxDeviceAuth, '', body).toString('base64')
    const headers = { ...this.headers, Signature: signature }

    const ret = await fetch(Endpoints.XboxDeviceAuth, { method: 'post', headers, body }).then(checkStatus)
    debug('Xbox Device Token', ret)
    return ret.Token
  }

  // This *only* works with live.com auth
  async getTitleToken (msaAccessToken, deviceToken) {
    const payload = {
      Properties: {
        AuthMethod: 'RPS',
        DeviceToken: deviceToken,
        RpsTicket: 't=' + msaAccessToken,
        SiteName: 'user.auth.xboxlive.com',
        ProofKey: this.jwk
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    }
    const body = JSON.stringify(payload)
    const signature = this.sign(Endpoints.XboxTitleAuth, '', body).toString('base64')

    const headers = { ...this.headers, Signature: signature }

    const ret = await fetch(Endpoints.XboxTitleAuth, { method: 'post', headers, body }).then(checkStatus)
    debug('Xbox Title Token', ret)
    return ret.Token
  }
}

module.exports = XboxTokenManager
