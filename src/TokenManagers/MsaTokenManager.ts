const msal = require('@azure/msal-node')
const debug = require('debug')('prismarine-auth')

const FileCache = require('../common/cache/FileCache')

class MsaTokenManager {
  cache: typeof FileCache
  forceRefresh?: boolean | undefined
  scopes: string[]
  msaClientId: string
  msalApp: any
  msalConfig: any
  msaCache: any

  constructor (msalConfig: {
    auth: {
      clientId: string
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: (cacheContext: any) => Promise<void>,
        afterCacheAccess: (cacheContext: any) => Promise<void>
      }
    }
  }, scopes: string[], cache: typeof FileCache) {
    this.msaClientId = msalConfig.auth.clientId
    this.scopes = scopes
    this.cache = cache

    const beforeCacheAccess = async (cacheContext: any) => {
      cacheContext.tokenCache.deserialize(JSON.stringify(await this.cache.getCached()))
    }

    const afterCacheAccess = async (cacheContext: any) => {
      if (cacheContext.cacheHasChanged) {
        await this.cache.setCachedPartial(JSON.parse(cacheContext.tokenCache.serialize()))
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

  getUsers () {
    const accounts = this.msaCache.Account
    const users: any[] = []
    if (!accounts) return users
    for (const account of Object.values(accounts)) {
      users.push(account)
    }
    return users
  }

  async getAccessToken () {
    const { AccessToken: tokens } = await this.cache.getCached()
    if (!tokens) return
    const account: any = Object.values(tokens).filter((t: any) => t.client_id === this.msaClientId)[0]
    if (!account) {
      debug('[msa] No valid access token found', tokens)
      return
    }
    const until = new Date(account.expires_on * 1000).getTime() - Date.now()
    const valid = until > 1000
    return { valid, until, token: account.secret }
  }

  async getRefreshToken () {
    const { RefreshToken: tokens } = await this.cache.getCached()
    if (!tokens) return
    const account: any = Object.values(tokens).filter((t: any) => t.client_id === this.msaClientId)[0]
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
      this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest).then((response: any) => {
        debug('[msa] refreshed token', JSON.stringify(response))
        resolve(response)
      }).catch((error: Error) => {
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
  async authDeviceCode (dataCallback: (resp: any) => void) {
    const deviceCodeRequest = {
      deviceCodeCallback: (resp: any) => {
        debug('[msa] device_code response: ', resp)
        dataCallback(resp)
      },
      scopes: this.scopes
    }

    return new Promise((resolve, reject) => {
      this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest).then((response: any) => {
        debug('[msa] device_code resp', JSON.stringify(response))
        this.cache.getCached()
          .then((cached: any) => {
            if (!cached.Account) {
              cached.Account = { '': response.account }
              this.cache.setCachedPartial(cached)
            }
            resolve(response)
          })
      }).catch((error: Error) => {
        console.warn('[msa] Error getting device code')
        console.debug(JSON.stringify(error))
        reject(error)
      })
    })
  }
}
module.exports = MsaTokenManager
