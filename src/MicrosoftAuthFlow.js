const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const minecraftFolderPath = require('minecraft-folder-path')
const debug = require('debug')('minecraft-protocol')

const { Authentication, msalConfig } = require('./Constants')
const { LiveTokenManager, MsaTokenManager, XboxTokenManager } = require('./Tokens')

async function retry (methodFn, beforeRetry, times) {
  while (times--) {
    if (times !== 0) {
      try { return await methodFn() } catch (e) { debug(e) }
      await new Promise(resolve => setTimeout(resolve, 2000))
      await beforeRetry()
    } else {
      return await methodFn()
    }
  }
}

class MicrosoftAuthFlow {
  constructor (username, cacheDir = minecraftFolderPath, options = {}, codeCallback) {
    this.username = username
    this.options = options
    this.initTokenCaches(username, cacheDir)
    this.codeCallback = codeCallback
  }

  initTokenCaches (username, cacheDir) {
    const hash = sha1(username).substr(0, 6)

    let cache = path.join(cacheDir, 'npm-cache')
    debug(`Using cache path: ${cache}`)
    try {
      if (!fs.existsSync(cache)) {
        fs.mkdirSync(cache, { recursive: true })
      }
    } catch (e) {
      console.log('Failed to open cache dir', e)
      cache = __dirname
    }

    const cachePaths = {
      live: path.join(cache, `./${hash}_live-cache.json`),
      msa: path.join(cache, `./${hash}_msa-cache.json`),
      xbl: path.join(cache, `./${hash}_xbl-cache.json`),
      bed: path.join(cache, `./${hash}_bed-cache.json`)
    }

    if (this.options.authTitle) { // Login with login.live.com
      const scopes = ['service::user.auth.xboxlive.com::MBI_SSL']
      this.msa = new LiveTokenManager(this.options.authTitle, scopes, cachePaths.live)
    } else { // Login with microsoftonline.com
      const scopes = ['XboxLive.signin', 'offline_access']
      this.msa = new MsaTokenManager(msalConfig, scopes, cachePaths.msa)
    }

    const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
    this.xbl = new XboxTokenManager(Authentication.XSTSRelyingParty, keyPair, cachePaths.xbl)
  }

  static resetTokenCaches (cacheDir = minecraftFolderPath) {
    const cache = path.join(cacheDir, 'npm-cache')
    try {
      if (fs.existsSync(cache)) {
        fs.rmdirSync(cache, { recursive: true })
        return true
      }
    } catch (e) {
      console.log('Failed to clear cache dir', e)
      return false
    }
  }

  async getMsaToken () {
    if (await this.msa.verifyTokens()) {
      debug('[msa] Using existing tokens')
      return this.msa.getAccessToken().token
    } else {
      debug('[msa] No valid cached tokens, need to sign in')
      const ret = await this.msa.authDeviceCode((response) => {
        console.info('[msa] First time signing in. Please authenticate now:')
        console.info(response.message)
        if (this.codeCallback) this.codeCallback(response)
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

  async getXboxToken () {
    if (await this.xbl.verifyTokens()) {
      debug('[xbl] Using existing XSTS token')
      return this.xbl.getCachedXstsToken().data
    } else if (this.options.password) {
      debug('[xbl] password is present, trying to authenticate using xboxreplay/xboxlive-auth')
      const xsts = await this.xbl.doReplayAuth(this.username, this.options.password)
      if (!xsts) {
        delete this.options.password
        return this.getXboxToken()
      }
      return xsts
    } else {
      debug('[xbl] Need to obtain tokens')
      return await retry(async () => {
        const msaToken = await this.getMsaToken()
        const ut = await this.xbl.getUserToken(msaToken, !this.options.authTitle)

        if (this.options.authTitle) {
          const deviceToken = await this.xbl.getDeviceToken({ DeviceType: 'Nintendo', Version: '0.0.0' })
          const titleToken = await this.xbl.getTitleToken(msaToken, deviceToken)
          const xsts = await this.xbl.getXSTSToken(ut, deviceToken, titleToken)
          return xsts
        } else {
          const xsts = await this.xbl.getXSTSToken(ut)
          return xsts
        }
      }, () => { this.msa.forceRefresh = true }, 2)
    }
  }
}

function sha1 (data) {
  return crypto.createHash('sha1').update(data || '', 'binary').digest('hex')
}

module.exports = MicrosoftAuthFlow
