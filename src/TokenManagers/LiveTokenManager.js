const debug = require('debug')('prismarine-auth')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class LiveTokenManager {
  constructor (clientId, scopes, cache, abortSignal) {
    this.clientId = clientId
    this.scopes = scopes
    this.cache = cache
    this.forceRefresh = false
    this.abortSignal = abortSignal
    this.abortSignal?.addEventListener('abort', () => { this.polling = false })
  }

  async verifyTokens () {
    if (this.forceRefresh) try { await this.refreshTokens() } catch { }
    const at = await this.getAccessToken()
    const rt = await this.getRefreshToken()
    if (!at || !rt) {
      return false
    }
    debug('[live] have at, rt', at, rt)
    if (at.valid && rt) {
      return true
    } else {
      try {
        await this.refreshTokens()
        return true
      } catch (e) {
        console.warn('Error refreshing token', e) // TODO: looks like an error happens here
        return false
      }
    }
  }

  async refreshTokens () {
    const rtoken = await this.getRefreshToken()
    if (!rtoken) {
      throw new Error('Cannot refresh without refresh token')
    }

    const codeRequest = {
      method: 'post',
      body: new URLSearchParams({ scope: this.scopes, client_id: this.clientId, grant_type: 'refresh_token', refresh_token: rtoken.token }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'include' // This cookie handler does not work on node-fetch ...
    }

    const token = await fetch(Endpoints.live.tokenRequest, codeRequest).then(checkStatus)
    this.updateCachedToken(token)
    return token
  }

  async getAccessToken () {
    const cached = await this.cache.get('tokens')
    if (!cached) return
    return { valid: cached.valid, token: cached.value.access_token, until: cached.expiresOn }
  }

  async getRefreshToken () {
    const cached = await this.cache.get('tokens')
    if (!cached) return
    return { valid: cached.valid, token: cached.value.refresh_token, until: cached.expiresOn }
  }

  async updateCachedToken (data) {
    await this.cache.set('tokens', data, { obtainedOn: Date.now(), expiresOn: data.expires_in * 1000 })
  }

  async authDeviceCode (deviceCodeCallback) {
    const acquireTime = Date.now()
    const codeRequest = {
      signal: this.abortSignal,
      method: 'post',
      body: new URLSearchParams({ scope: this.scopes, client_id: this.clientId, response_type: 'device_code' }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'include' // This cookie handler does not work on node-fetch ...
    }

    debug('Requesting live device token', codeRequest)

    const cookies = []

    const res = await fetch(Endpoints.live.deviceCodeRequest, codeRequest)
      .then(res => {
        if (res.status !== 200) {
          res.text().then(console.warn)
          throw Error('Failed to request live.com device code')
        }
        if (res.headers.get('set-cookie')) {
          const cookie = res.headers.get('set-cookie')
          const [keyval] = cookie.split(';')
          cookies.push(keyval)
        }
        return res
      })
      .then(checkStatus).then(resp => {
        resp.message ||= `To sign in, use a web browser to open the page ${resp.verification_uri} and use the code ${resp.user_code} or visit http://microsoft.com/link?otc=${resp.user_code}`
        deviceCodeCallback({
          userURL: resp.verification_uri,
          userCode: resp.user_code,
          deviceId: resp.device_code,
          checkingInterval: resp.interval,
          message: resp.message,
          expiresInSeconds: resp.expires_in, // s
          expiresOn: acquireTime + (resp.expires_in * 1000) // ms
        })
        return resp
      })
    const expireTime = acquireTime + (res.expires_in * 1000) - 100 /* for safety */

    this.polling = true
    while (this.polling && expireTime > Date.now()) {
      await new Promise(resolve => setTimeout(resolve, res.interval * 1000))
      try {
        const verifi = {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookies.join('; ')
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            device_code: res.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          }).toString()
        }

        const token = await fetch(Endpoints.live.tokenRequest + '?client_id=' + this.clientId, verifi)
          .then(res => res.json()).then(res => {
            if (res.error) {
              if (res.error === 'authorization_pending') {
                debug('[live] Still waiting:', res.error_description)
              } else {
                throw Error(`Failed to acquire authorization code from device token (${res.error}) - ${res.error_description}`)
              }
            } else {
              return res
            }
          })
        if (!token) continue
        this.updateCachedToken(token)
        this.polling = false
        return { accessToken: token.access_token }
      } catch (e) {
        console.debug(e)
      }
    }
    this.polling = false
    throw Error('Authentication failed, timed out')
  }
}

module.exports = LiveTokenManager
