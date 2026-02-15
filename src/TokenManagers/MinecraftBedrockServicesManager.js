const debug = require('debug')('prismarine-auth')

const { Endpoints } = require('../common/Constants')
const { checkStatus } = require('../common/Util')

class MinecraftBedrockServicesTokenManager {
  constructor (cache, abortSignal) {
    this.cache = cache
    this.abortSignal = abortSignal
  }

  async getCachedAccessToken () {
    const cached = await this.cache.get('mcs')
    if (!cached) return { valid: false }
    return {
      valid: cached.valid,
      until: cached.expiresOn,
      token: cached.value.mcToken,
      data: cached.value
    }
  }

  async setCachedToken (data) {
    await this.cache.set('mcs', data, { obtainedOn: Date.now(), expiresOn: data.validUntil })
  }

  async getAccessToken (sessionTicket, options = {}) {
    const response = await fetch(Endpoints.minecraftBedrock.servicesSessionStart, {
      signal: this.abortSignal,
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

    const tokenResponse = {
      mcToken: response.result.authorizationHeader,
      validUntil: response.result.validUntil,
      treatments: response.result.treatments,
      configurations: response.result.configurations,
      treatmentContext: response.result.treatmentContext
    }

    debug('[mc] mc-services token response', tokenResponse)

    await this.setCachedToken({ mcs: tokenResponse })

    return tokenResponse
  }
}

module.exports = MinecraftBedrockServicesTokenManager
