const debug = require('debug')('prismarine-auth')
const { Endpoints } = require('../common/Constants')

class PlayfabTokenManager {
  constructor (cache, abortSignal) {
    this.cache = cache
    this.abortSignal = abortSignal
  }

  async setCachedAccessToken (data) {
    const expires = new Date(data.EntityToken.TokenExpiration)
    await this.cache.set('auth', data, { expiresOn: Number(expires) })
  }

  async getCachedAccessToken () {
    const cache = await this.cache.get('auth')
    debug('[pf] token cache', cache)
    if (!cache) return
    return {
      valid: cache.valid,
      until: cache.expiresOn,
      data: cache.value
    }
  }

  async getAccessToken (xsts) {
    const response = await fetch(Endpoints.PlayfabLoginWithXbox, {
      signal: this.abortSignal,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CreateAccount: true,
        EncryptedRequest: null,
        InfoRequestParameters: {
          GetCharacterInventories: false,
          GetCharacterList: false,
          GetPlayerProfile: true,
          GetPlayerStatistics: false,
          GetTitleData: false,
          GetUserAccountInfo: true,
          GetUserData: false,
          GetUserInventory: false,
          GetUserReadOnlyData: false,
          GetUserVirtualCurrency: false,
          PlayerStatisticNames: null,
          ProfileConstraints: null,
          TitleDataKeys: null,
          UserDataKeys: null,
          UserReadOnlyDataKeys: null
        },
        PlayerSecret: null,
        TitleId: '20CA2',
        XboxToken: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}`
      })
    })

    const data = await response.json()
    await this.setCachedAccessToken({ pfb: data.data })
    return data.data
  }
}

module.exports = PlayfabTokenManager
