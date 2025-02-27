const msal = require('@azure/msal-node')
const debug = require('debug')('prismarine-auth')

class MsaTokenManager {
  constructor (msalConfig, scopes, cache, abortSingal) {
    this.msaClientId = msalConfig.auth.clientId
    this.scopes = scopes
    this.cache = cache

    const beforeCacheAccess = async (cacheContext) => {
      const cached = await this.cache.get('msa')
      cacheContext.tokenCache.deserialize(JSON.stringify(cached ? cached.value : {}))
    }

    const afterCacheAccess = async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        await this.cache.setPartial('msa', JSON.parse(cacheContext.tokenCache.serialize()))
      }
    }

    const cachePlugin = {
      beforeCacheAccess,
      afterCacheAccess
    }

    msalConfig.cache = {
      cachePlugin
    }
    this.msalApp = new msal.PublicClientApplication(msalConfig)
    this.msalConfig = msalConfig
    this.abortSignal = abortSingal
  }

  async getUsers () {
    const cache = await this.cache.get('msa')
    if (!cache || !cache.valid) return []
    const accounts = cache.value.Account
    const users = []
    if (!accounts) return users
    for (const account of Object.values(accounts)) {
      users.push(account)
    }
    return users
  }

  async getAccessToken () {
    const cache = await this.cache.get('msa')
    if (!cache || !cache.valid) return
    const tokens = cache.value.AccessToken
    const account = Object.values(tokens).filter(t => t.client_id === this.msaClientId)[0]
    if (!account) {
      debug('[msa] No valid access token found', tokens)
      return
    }
    const until = new Date(account.expires_on * 1000) - Date.now()
    const valid = until > 1000
    return { valid, until, token: account.secret }
  }

  async getRefreshToken () {
    const cache = await this.cache.get('msa')
    if (!cache || !cache.valid) return
    const tokens = cache.value.RefreshToken
    const account = Object.values(tokens).filter(t => t.client_id === this.msaClientId)[0]
    if (!account) {
      debug('[msa] No valid refresh token found', tokens)
      return
    }
    return { token: account.secret }
  }

  async refreshTokens () {
    const rtoken = await this.getRefreshToken()
    if (!rtoken) {
      throw new Error('Cannot refresh without refresh token')
    }
    const refreshTokenRequest = {
      refreshToken: rtoken.token,
      scopes: this.scopes
    }

    return new Promise((resolve, reject) => {
      this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest).then((response) => {
        debug('[msa] refreshed token', JSON.stringify(response))
        resolve(response)
      }).catch((error) => {
        debug('[msa] failed to refresh', JSON.stringify(error))
        reject(error)
      })
    })
  }

  async verifyTokens () {
    if (this.forceRefresh) try { await this.refreshTokens() } catch { }
    const at = await this.getAccessToken()
    const rt = await this.getRefreshToken()
    if (!at || !rt) {
      return false
    }
    debug('[msa] have at, rt', at, rt)
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

  // Authenticate with device_code flow
  async authDeviceCode (dataCallback, timeout) {
    const deviceCodeRequest = {
      deviceCodeCallback: (resp) => {
        debug('[msa] device_code response: ', resp)
        dataCallback(resp)
      },
      timeout,
      scopes: this.scopes
    }

    this.abortSignal?.addEventListener('abort', () => {
      debug('[msa] Aborted device code request')
      deviceCodeRequest.cancel = true
    })

    return new Promise((resolve, reject) => {
      this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest).then((response) => {
        debug('[msa] device_code resp', JSON.stringify(response))
        this.cache.get('msa')
          .then(({ value: cached }) => {
            if (!cached.Account) {
              cached.Account = { '': response.account }
              this.cache.setPartial('msa', cached)
            }
            resolve(response)
          })
      }).catch((error) => {
        console.warn('[msa] Error getting device code. Ensure your supplied `authTitle` token (or clientId in your supplied MSAL config) is valid and that it has permission to do non-interactive code based auth.')
        console.debug(JSON.stringify(error))
        reject(error)
      })
    })
  }
}
module.exports = MsaTokenManager
