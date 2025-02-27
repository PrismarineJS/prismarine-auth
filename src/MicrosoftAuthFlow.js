const crypto = require('crypto')
const debug = require('debug')('prismarine-auth')

const Titles = require('./common/Titles')
const { Endpoints, msalConfig } = require('./common/Constants')
const { createFileSystemCache } = require('./common/cache/FileCache')

const LiveTokenManager = require('./TokenManagers/LiveTokenManager')
const JavaTokenManager = require('./TokenManagers/MinecraftJavaTokenManager')
const XboxTokenManager = require('./TokenManagers/XboxTokenManager')
const MsaTokenManager = require('./TokenManagers/MsaTokenManager')
const BedrockTokenManager = require('./TokenManagers/MinecraftBedrockTokenManager')
const PlayfabTokenManager = require('./TokenManagers/PlayfabTokenManager')
const MCBedrockServicesTokenManager = require('./TokenManagers/MinecraftBedrockServicesManager')

async function retry (methodFn, beforeRetry, times) {
  while (times--) {
    if (times !== 0) {
      try { return await methodFn() } catch (e) { if (e instanceof URIError) { throw e } else { debug(e) } }
      await new Promise(resolve => setTimeout(resolve, 2000))
      await beforeRetry()
    } else {
      return await methodFn()
    }
  }
}

class MicrosoftAuthFlow {
  static CACHE_NAMES = ['msal', 'live', 'sisu', 'xbl', 'bed', 'mca', 'mcs', 'pfb']

  constructor (username = '', cacherOrDir = __dirname, options, codeCallback) {
    this.username = username
    if (options && !options.flow) {
      throw new Error("Missing 'flow' argument in options. See docs for more information.")
    }
    this.options = options || { flow: 'live', authTitle: Titles.MinecraftNintendoSwitch }
    this.ready = this._initTokenManagers(username, cacherOrDir, this.options.forceRefresh, this.options.abortSignal)
    this.codeCallback = codeCallback
  }

  async _initTokenManagers (username, cacherOrDir, forceRefresh, abortSignal) {
    const cacher = typeof cacherOrDir === 'string' ? createFileSystemCache(cacherOrDir, MicrosoftAuthFlow.CACHE_NAMES) : cacherOrDir
    if (forceRefresh) {
      await cacher.reset()
    }

    if (this.options.flow === 'live' || this.options.flow === 'sisu') {
      if (!this.options.authTitle) throw new Error(`Please specify an "authTitle" in Authflow constructor when using ${this.options.flow} flow`)
      this.msa = new LiveTokenManager(this.options.authTitle, ['service::user.auth.xboxlive.com::MBI_SSL'],
        await cacher.createCache({ cacheName: this.options.flow, username }), abortSignal)
      this.doTitleAuth = true
    } else if (this.options.flow === 'msal') {
      let config = this.options.msalConfig
      if (!config) {
        config = structuredClone(msalConfig)
        if (!this.options.authTitle) throw new Error('Must specify an Azure client ID token inside the `authTitle` parameter when using Azure-based auth. See https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app#register-an-application for more information on obtaining an Azure token.')
        config.auth.clientId = this.options.authTitle
      }
      const scopes = this.options.scopes ?? ['XboxLive.signin']
      this.msa = new MsaTokenManager(config, scopes.concat('offline_access'),
        await cacher.createCache({ cacheName: 'msal', username }), abortSignal)
    } else {
      throw new Error(`Unknown flow: ${this.options.flow} (expected "live", "sisu", or "msal")`)
    }

    const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
    this.xbl = new XboxTokenManager(keyPair, await cacher.createCache({ cacheName: 'xbl', username }), abortSignal)
    this.mba = new BedrockTokenManager(await cacher.createCache({ cacheName: 'bed', username }), abortSignal)
    this.mca = new JavaTokenManager(await cacher.createCache({ cacheName: 'mca', username }), abortSignal)
    this.mcs = new MCBedrockServicesTokenManager(await cacher.createCache({ cacheName: 'mcs', username }), abortSignal)
    this.pfb = new PlayfabTokenManager(await cacher.createCache({ cacheName: 'pfb', username }), abortSignal)
  }

  async getMsaToken () {
    await this.ready
    if (await this.msa.verifyTokens()) {
      debug('[msa] Using existing tokens')
      const { token } = await this.msa.getAccessToken()
      return token
    } else {
      debug('[msa] No valid cached tokens, need to sign in')
      const ret = await this.msa.authDeviceCode((response) => {
        if (this.codeCallback) return this.codeCallback(response)
        console.info('[msa] First time signing in. Please authenticate now:')
        console.info(response.message)
      })

      if (ret.account) {
        console.info(`[msa] Signed in as ${ret.account.username}`)
      } else { // We don't get extra account data here per scope
        console.info('[msa] Signed in with Microsoft')
      }

      debug('[msa] got auth result', ret)
      return ret.accessToken
    }
  }

  async getPlayfabLogin () {
    await this.ready
    const cache = this.pfb.getCachedAccessToken()
    if (cache.valid) {
      return cache.data
    }
    const xsts = await this.getXboxToken(Endpoints.PlayfabRelyingParty)
    const playfab = await this.pfb.getAccessToken(xsts)
    return playfab
  }

  async getMinecraftBedrockServicesToken ({ verison }) {
    await this.ready
    const cache = await this.mcs.getCachedAccessToken()
    if (cache.valid) {
      return cache.data
    }
    const playfab = await this.getPlayfabLogin()
    const mcs = await this.mcs.getAccessToken(playfab.SessionTicket, { verison })
    return mcs
  }

  async getXboxToken (relyingParty = this.options.relyingParty || Endpoints.xbox.relyingParty, forceRefresh = false) {
    await this.ready
    const options = { ...this.options, relyingParty }
    const { xstsToken, userToken, deviceToken, titleToken } = await this.xbl.getCachedTokens(relyingParty)

    if (xstsToken.valid && !forceRefresh) {
      debug('[xbl] Using existing XSTS token')
      return xstsToken.data
    }

    if (options.password) {
      debug('[xbl] password is present, trying to authenticate using xboxreplay/xboxlive-auth')
      const xsts = await this.xbl.doReplayAuth(this.username, options.password, options)
      return xsts
    }

    debug('[xbl] Need to obtain tokens')

    return await retry(async () => {
      const msaToken = await this.getMsaToken()

      // sisu flow generates user and title tokens differently to other flows and should also be used to refresh them if they are invalid
      if (options.flow === 'sisu' && (!userToken.valid || !deviceToken.valid || !titleToken.valid)) {
        debug(`[xbl] Sisu flow selected, trying to authenticate with authTitle ID ${options.authTitle}`)
        const dt = await this.xbl.getDeviceToken(options)
        const sisu = await this.xbl.doSisuAuth(msaToken, dt, options)
        return sisu
      }

      const ut = userToken.token ?? await this.xbl.getUserToken(msaToken, options.flow === 'msal')
      const dt = deviceToken.token ?? await this.xbl.getDeviceToken(options)
      const tt = titleToken.token ?? (this.doTitleAuth ? await this.xbl.getTitleToken(msaToken, dt) : undefined)

      const xsts = await this.xbl.getXSTSToken({ userToken: ut, deviceToken: dt, titleToken: tt }, options)
      return xsts
    }, () => { this.msa.forceRefresh = true }, 2)
  }

  async getMinecraftJavaToken (options = {}) {
    await this.ready
    const response = { token: '', entitlements: {}, profile: {} }
    if (await this.mca.verifyTokens()) {
      debug('[mc] Using existing tokens')
      const { token } = await this.mca.getCachedAccessToken()
      response.token = token
    } else {
      debug('[mc] Need to obtain tokens')
      await retry(async () => {
        const xsts = await this.getXboxToken(Endpoints.minecraftJava.XSTSRelyingParty)
        debug('[xbl] xsts data', xsts)
        response.token = await this.mca.getAccessToken(xsts)
      }, () => { this.xbl.forceRefresh = true }, 2)
    }

    if (options.fetchEntitlements) {
      response.entitlements = await this.mca.fetchEntitlements(response.token).catch(e => debug('Failed to obtain entitlement data', e))
    }
    if (options.fetchProfile) {
      response.profile = await this.mca.fetchProfile(response.token).catch(e => debug('Failed to obtain profile data', e))
    }
    if (options.fetchCertificates) {
      response.certificates = await this.mca.fetchCertificates(response.token).catch(e => debug('Failed to obtain keypair data', e))
    }
    if (options.fetchAttributes) {
      // TODO: Implement fetchAttributes on MinecraftJavaTokenManager
      // response.attributes = await this.mca.fetchAttributes(response.token).catch(e => debug('Failed to obtain attributes data', e))
    }

    return response
  }

  async getMinecraftBedrockToken (publicKey) {
    await this.ready
    // TODO: Fix cache, in order to do cache we also need to cache the ECDH keys so disable it
    // is this even a good idea to cache?
    if (await this.mba.verifyTokens() && false) { // eslint-disable-line
      debug('[mc] Using existing tokens')
      const { chain } = this.mba.getCachedAccessToken()
      return chain
    } else {
      if (!publicKey) throw new Error('Need to specifiy a ECDH x509 URL encoded public key')
      debug('[mc] Need to obtain tokens')
      return await retry(async () => {
        const xsts = await this.getXboxToken(Endpoints.minecraftBedrock.XSTSRelyingParty)
        debug('[xbl] xsts data', xsts)
        const token = await this.mba.getAccessToken(publicKey, xsts)
        // If we want to auth with a title ID, make sure there's a TitleID in the response
        const body = JSON.parse(Buffer.from(token.chain[1].split('.')[1], 'base64').toString())
        if (!body.extraData.titleId && this.doTitleAuth) {
          throw Error('missing titleId in response')
        }
        return token.chain
      }, () => { this.xbl.forceRefresh = true }, 2)
    }
  }
}

module.exports = MicrosoftAuthFlow
