const debug = require('debug')('prismarine-auth')

const { Endpoints } = require('../common/Constants')
const { checkStatusWithHelp } = require('../common/Util')

class BedrockTokenManager {
  constructor (cache, abortSignal) {
    this.cache = cache
    this.abortSignal = abortSignal
  }

  async getCachedAccessToken () {
    const token = await this.cache.get('accessTokens')
    debug('[mc] token cache', token)
    if (!token) return
    debug('Auth token', token)
    return {
      valid: token.valid,
      until: token.expiresOn,
      chain: token.value.chain
    }
  }

  async setCachedAccessToken (data) {
    if (!data.chain || !data.chain.length) {
      throw new Error('Invalid data: missing chain information')
    }
    const jwt = data.chain[0]
    const [header, payload, signature] = jwt.split('.').map(k => Buffer.from(k, 'base64')) // eslint-disable-line

    const body = JSON.parse(String(payload))
    const expiresIn = body.exp * 1000
    data.expires = expiresIn

    await this.cache.set('accessTokens', data, { obtainedOn: Date.now(), expiresOn: expiresIn })
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

  async getAccessToken (clientPublicKey, xsts) {
    debug('[mc] authing to minecraft', clientPublicKey, xsts)
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCPE/UWP',
      Authorization: `XBL3.0 x=${xsts.userHash};${xsts.XSTSToken}`
    }
    const MineServicesResponse = await fetch(Endpoints.minecraftBedrock.authenticate, {
      signal: this.abortSignal,
      method: 'post',
      headers,
      body: JSON.stringify({ identityPublicKey: clientPublicKey })
    }).then(checkStatusWithHelp({ 401: 'Ensure that you are able to sign-in to Minecraft with this account' }))

    debug('[mc] mc auth response', MineServicesResponse)
    await this.setCachedAccessToken(MineServicesResponse)
    return MineServicesResponse
  }
}

module.exports = BedrockTokenManager
