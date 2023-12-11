const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

const getMatchForIndex = (entry, regex, index = 0) => {
  const match = entry.match(regex)
  return match?.[index] || 0
}

class LiveTokenManager {
  constructor (clientId, scopes, cache) {
    this.clientId = clientId
    this.scopes = scopes
    this.cache = cache
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

    const token = await fetch(Endpoints.LiveTokenRequest, codeRequest).then(checkStatus)
    this.updateCache(token)
    return token
  }

  async getAccessToken () {
    const { token } = await this.cache.getCached()
    if (!token) return
    const until = new Date(token.obtainedOn + token.expires_in) - Date.now()
    const valid = until > 1000
    return { valid, until, token: token.access_token }
  }

  async getRefreshToken () {
    const { token } = await this.cache.getCached()
    if (!token) return
    const until = new Date(token.obtainedOn + token.expires_in) - Date.now()
    const valid = until > 1000
    return { valid, until, token: token.refresh_token }
  }

  async updateCache (data) {
    await this.cache.setCachedPartial({
      token: {
        ...data,
        obtainedOn: Date.now()
      }
    })
  }

  async authDeviceCode (deviceCodeCallback) {
    const acquireTime = Date.now()
    const codeRequest = {
      method: 'post',
      body: new URLSearchParams({ scope: this.scopes, client_id: this.clientId, response_type: 'device_code' }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'include' // This cookie handler does not work on node-fetch ...
    }

    debug('Requesting live device token', codeRequest)

    const cookies = []

    const res = await fetch(Endpoints.LiveDeviceCodeRequest, codeRequest)
      .then(res => {
        if (res.status !== 200) {
          res.text().then(console.warn)
          throw Error('Failed to request live.com device code')
        }
        for (const cookie of Object.values(res.headers.raw()['set-cookie'])) {
          const [keyval] = cookie.split(';')
          cookies.push(keyval)
        }
        return res
      })
      .then(checkStatus).then(resp => {
        resp.message = `To sign in, use a web browser to open the page ${resp.verification_uri} and enter the code ${resp.user_code} to authenticate.`
        deviceCodeCallback(resp)
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

        const token = await fetch(Endpoints.LiveTokenRequest + '?client_id=' + this.clientId, verifi)
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
        this.updateCache(token)
        this.polling = false
        return { accessToken: token.access_token }
      } catch (e) {
        console.debug(e)
      }
    }
    this.polling = false
    throw Error('Authentication failed, timed out')
  }

  async preparePasswordAuth () {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
      response_type: 'token',
      scope: this.scopes
    })

    const response = await fetch(`${Endpoints.LiveTokenAuth}?${params}`)

    const body = await response.text() || ''

    const cookie = (response.headers.raw()['set-cookie'] || [])
      .map((c) => c.split(';')[0]).join('; ')

    const matches = {
      PPFT: getMatchForIndex(body, /sFTTag:'.*value="(.*)"\/>'/, 1),
      urlPost: getMatchForIndex(body, /urlPost:'(.+?(?='))/, 1)
    }

    debug(`Pre-auth response: ${JSON.stringify(matches)}`)

    if (matches.PPFT !== 0 && matches.urlPost !== 0) {
      return {
        url: response.url,
        cookie,
        matches
      }
    }

    // fetch error from html body else throw url hash which contains error
    const inBodyError = (body.match(/(?<=<span id="errorDescription">)(.*?)(?=<\/span>)/gm) || [])[0]

    throw Error(inBodyError || new URL(response.url).hash)
  }

  async getAccessTokenWithPassword (email, password) {
    const preAuthResponse = await this.preparePasswordAuth()

    const payload = new URLSearchParams()
    payload.append('login', email)
    payload.append('loginfmt', email)
    payload.append('passwd', password)
    payload.append('PPFT', preAuthResponse.matches.PPFT)

    debug(`Requesting access token with email ${email} and password with clientId ${this.clientId} and scopes ${this.scopes}`)

    const response = await fetch(preAuthResponse.matches.urlPost, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Cookie: preAuthResponse.cookie
      },
      body: payload.toString(),
      redirect: 'manual'
    })

    // Proof.Type is an object that contains the type of 2FA option enabled on the account
    const isTwoFactorEnabled = getMatchForIndex(await response.text(), /(?<=PROOF\.Type = )(.*?)(?=;)/)

    if (isTwoFactorEnabled) {
      throw Error('Two factor authentication is enabled on this account, please use DeviceCode instead by removing the password option.')
    }

    // if the response is 200 then we have landed on a "failed" page i.e. Incorrect credentials, new application or a new signin location
    if (response.status === 200) {
      throw Error(`Couldn't sign in at ${preAuthResponse.url} with email ${email} and password. Please see https://github.com/PrismarineJS/prismarine-auth/blob/master/docs/API.md#why-is-password-auth-unreliable-`)
    }

    const location = response.headers.get('location')
    const hash = location.split('#')[1]
    const output = {}

    for (const part of new URLSearchParams(hash)) {
      if (part[0] === 'expires_in') output[part[0]] = Number(part[1])
      else output[part[0]] = part[1]
    }

    await this.updateCache(output)

    debug(`Got access token: ${JSON.stringify(output)}`)

    return output
  }
}

module.exports = LiveTokenManager
