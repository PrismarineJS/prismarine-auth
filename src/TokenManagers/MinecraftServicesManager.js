const debug = require('debug')('prismarine-auth')
const fetch = require('node-fetch')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class MinecraftServicesTokenManager {
  constructor(cache) {
    this.cache = cache
  }

  async getCachedAccessToken() {
    const { mcs: token } = await this.cache.getCached()
    debug('[mcs] token cache', token)

    if (!token) return { valid: false }

    const expires = new Date(token.validUntil)
    const remainingMs = expires - Date.now()
    const valid = remainingMs > 1000
    return { valid, until: expires, token: token.authorizationHeader, data: token }
  }

  async setCachedToken(data) {
    await this.cache.setCachedPartial(data)
  }

  async getAccessToken(sessionTicket, options = {}) {

    const response = await fetch(Endpoints.MinecraftServicesSessionStart, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device: { 
          applicationType: options.applicationType ?? 'MinecraftPE', 
          gameVersion: options.version ?? '1.20.62', 
          id: options.deviceId ?? 'c1681ad3-415e-30cd-abd3-3b8f51e771d1',
          memory: options.deviceMemory ?? String(8 * (1024 * 1024 * 1024)),
          platform: options.platform ?? 'Windows10',
          playFabTitleId: options.playFabtitleId ?? '20CA2',
          storePlatform: options.storePlatform ?? 'uwp.store',
          type: options.type ?? 'Windows10'
        },
        user: {
          token: sessionTicket,
          tokenType: 'PlayFab'
        }
      })
    }).then(checkStatus)

    debug('[mc] mc-services token response', response.result)

    await this.setCachedToken({ mcs: response.result })

    return response.result

  }
}

module.exports = MinecraftServicesTokenManager
