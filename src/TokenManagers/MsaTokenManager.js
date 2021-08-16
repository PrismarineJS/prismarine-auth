const fs = require('fs')
const path = require('path')
const msal = require('@azure/msal-node')
const debug = require('debug')('prismarine-auth')

class MsaTokenManager {
  constructor (msalConfig, scopes, cacheLocation) {
    this.msaClientId = msalConfig.auth.clientId
    this.scopes = scopes
    this.cacheLocation = cacheLocation || path.join(__dirname, './msa-cache.json')

    this.reloadCache()

    const beforeCacheAccess = async (cacheContext) => {
      cacheContext.tokenCache.deserialize(await fs.promises.readFile(this.cacheLocation, 'utf-8'))
    }

    const afterCacheAccess = async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        await fs.promises.writeFile(this.cacheLocation, cacheContext.tokenCache.serialize())
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
  }

  reloadCache () {
    try {
      this.msaCache = JSON.parse(fs.readFileSync(this.cacheLocation, 'utf8'))
    } catch (e) {
      this.msaCache = {}
      fs.writeFileSync(this.cacheLocation, JSON.stringify(this.msaCache))
    }
  }

  getUsers () {
    const accounts = this.msaCache.Account
    const users = []
    if (!accounts) return users
    for (const account of Object.values(accounts)) {
      users.push(account)
    }
    return users
  }

  getAccessToken () {
    const tokens = this.msaCache.AccessToken
    if (!tokens) return
    const account = Object.values(tokens).filter(t => t.client_id === this.msaClientId)[0]
    if (!account) {
      debug('[msa] No valid access token found', tokens)
      return
    }
    const until = new Date(account.expires_on * 1000) - Date.now()
    const valid = until > 1000
    return { valid, until, token: account.secret }
  }

  getRefreshToken () {
    const tokens = this.msaCache.RefreshToken
    if (!tokens) return
    const account = Object.values(tokens).filter(t => t.client_id === this.msaClientId)[0]
    if (!account) {
      debug('[msa] No valid refresh token found', tokens)
      return
    }
    return { token: account.secret }
  }

  async refreshTokens () {
    const rtoken = this.getRefreshToken()
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
        this.reloadCache()
        resolve(response)
      }).catch((error) => {
        debug('[msa] failed to refresh', JSON.stringify(error))
        reject(error)
      })
    })
  }

  async verifyTokens () {
    if (this.forceRefresh) try { await this.refreshTokens() } catch { }
    const at = this.getAccessToken()
    const rt = this.getRefreshToken()
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
  async authDeviceCode (dataCallback) {
    const deviceCodeRequest = {
      deviceCodeCallback: (resp) => {
        debug('[msa] device_code response: ', resp)
        dataCallback(resp)
      },
      scopes: this.scopes
    }

    return new Promise((resolve, reject) => {
      this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest).then((response) => {
        debug('[msa] device_code resp', JSON.stringify(response))
        if (!this.msaCache.Account) this.msaCache.Account = { '': response.account }
        resolve(response)
      }).catch((error) => {
        console.warn('[msa] Error getting device code')
        console.debug(JSON.stringify(error))
        reject(error)
      })
    })
  }
}
module.exports = MsaTokenManager
